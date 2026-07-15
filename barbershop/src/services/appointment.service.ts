import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CreateAppointmentInput } from "@/lib/validations/appointment";

// O Brasil não tem mais horário de verão desde 2019, então o offset de
// Brasília (America/Sao_Paulo) é fixo em UTC-3 o ano inteiro — não
// precisa de biblioteca de timezone para lidar com isso. Os horários
// salvos em Availability.startTime/endTime ("09:00", "18:00") são
// horário LOCAL da barbearia, não UTC, e essa constante converte entre
// os dois nos dois pontos onde isso é necessário: cálculo de slots
// livres e validação de novo agendamento.
const SHOP_UTC_OFFSET_HOURS = 3;

export class AppointmentConflictError extends Error {
  constructor(message = "Horário indisponível para este barbeiro") {
    super(message);
    this.name = "AppointmentConflictError";
  }
}

export class OutsideAvailabilityError extends Error {
  constructor(message = "Horário fora da disponibilidade do barbeiro") {
    super(message);
    this.name = "OutsideAvailabilityError";
  }
}

export class InvalidServiceError extends Error {
  constructor(message = "Serviço inválido ou inativo") {
    super(message);
    this.name = "InvalidServiceError";
  }
}

export class PastDateError extends Error {
  constructor(message = "Não é possível agendar em uma data no passado") {
    super(message);
    this.name = "PastDateError";
  }
}

const MAX_RETRIES = 2;

/**
 * Cria um agendamento com garantias fortes contra double-booking.
 *
 * Estratégia de duas camadas:
 * 1. Constraint única no banco (@@unique([barberId, startsAt])) pega
 *    colisão de horário EXATO mesmo sob falha desta função.
 * 2. Transação SERIALIZABLE + verificação de overlap pega sobreposição
 *    PARCIAL (ex: serviço de 45min que invade outro já marcado).
 *
 * Sob concorrência alta, o Postgres pode abortar a transação com erro
 * de serialização (P2034) mesmo sem conflito de negócio real — por
 * isso o retry automático abaixo.
 */
export async function createAppointment(clientId: string, input: CreateAppointmentInput) {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.active) {
    throw new InvalidServiceError();
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Data/hora inválida");
  }
  if (startsAt.getTime() < Date.now()) {
    throw new PastDateError();
  }

  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

  // Converte o horário do agendamento (armazenado em UTC) para horário
  // local da barbearia antes de comparar com Availability.startTime/endTime,
  // que são cadastrados em horário local (ex: "09:00" = 9h de Brasília).
  // O dia da semana também é calculado sobre o horário local — importante
  // porque perto da meia-noite UTC/local o dia pode ser diferente.
  const localHours = new Date(startsAt.getTime() - SHOP_UTC_OFFSET_HOURS * 3_600_000);
  const weekday = localHours.getUTCDay();
  const hhmm = localHours.toISOString().slice(11, 16); // "HH:mm" em horário local

  const availability = await prisma.availability.findFirst({
    where: { barberId: input.barberId, weekday },
  });

  if (!availability || hhmm < availability.startTime || hhmm >= availability.endTime) {
    throw new OutsideAvailabilityError();
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const overlapping = await tx.appointment.findFirst({
            where: {
              barberId: input.barberId,
              status: { in: ["SCHEDULED", "CONFIRMED"] },
              AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
            },
          });

          if (overlapping) {
            throw new AppointmentConflictError();
          }

          return tx.appointment.create({
            data: {
              clientId,
              barberId: input.barberId,
              serviceId: input.serviceId,
              startsAt,
              endsAt,
              priceAtBooking: service.price,
              status: "SCHEDULED",
            },
            include: {
              service: true,
              barber: { select: { id: true, name: true } },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (err) {
      const isSerializationFailure =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      const isUniqueViolation =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

      if (isUniqueViolation) {
        // Colisão de horário exato pega pela constraint do banco.
        throw new AppointmentConflictError();
      }
      if (isSerializationFailure && attempt < MAX_RETRIES) {
        continue; // tenta de novo
      }
      throw err;
    }
  }

  // Inalcançável, mas satisfaz o TypeScript quanto ao retorno.
  throw new AppointmentConflictError();
}

/**
 * Calcula horários livres de um barbeiro em uma data específica,
 * combinando a janela de disponibilidade com os agendamentos já existentes.
 */
export async function getAvailableSlots(barberId: string, serviceId: string, date: Date) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) {
    throw new InvalidServiceError();
  }

  const weekday = date.getUTCDay();
  const availability = await prisma.availability.findFirst({
    where: { barberId, weekday },
  });

  if (!availability) return [];

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const existing = await prisma.appointment.findMany({
    where: {
      barberId,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startsAt: { gte: dayStart, lte: dayEnd },
    },
    select: { startsAt: true, endsAt: true },
    orderBy: { startsAt: "asc" },
  });

  const [startH, startM] = availability.startTime.split(":").map(Number);
  const [endH, endM] = availability.endTime.split(":").map(Number);

  // startTime/endTime são horário LOCAL da barbearia (ex: "09:00" = 9h em
  // Brasília). Somamos o offset para converter para UTC antes de gerar
  // os slots, já que todo o resto do sistema (banco, comparações) trabalha
  // em UTC. Sem essa conversão, "09:00" seria interpretado como 9h UTC
  // (= 6h da manhã em Brasília), 3 horas adiantado do horário real de
  // funcionamento.
  const slots: string[] = [];
  const cursor = new Date(date);
  cursor.setUTCHours((startH ?? 0) + SHOP_UTC_OFFSET_HOURS, startM ?? 0, 0, 0);
  const limit = new Date(date);
  limit.setUTCHours((endH ?? 0) + SHOP_UTC_OFFSET_HOURS, endM ?? 0, 0, 0);

  const STEP_MIN = 15; // granularidade de slots ofertados ao cliente

  while (cursor.getTime() + service.durationMin * 60_000 <= limit.getTime()) {
    const slotEnd = new Date(cursor.getTime() + service.durationMin * 60_000);
    const conflicts = existing.some(
      (appt) => cursor < appt.endsAt && slotEnd > appt.startsAt
    );
    const isFuture = cursor.getTime() > Date.now();

    if (!conflicts && isFuture) {
      slots.push(cursor.toISOString());
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + STEP_MIN);
  }

  return slots;
}
