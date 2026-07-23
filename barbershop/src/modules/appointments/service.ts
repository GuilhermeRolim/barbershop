import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CreateAppointmentInput, UpdateAppointmentStatusInput } from "./validation";
import {
  AppointmentConflictError,
  OutsideAvailabilityError,
  InvalidServiceError,
  PastDateError,
  AppointmentNotFoundError,
  AppointmentAccessDeniedError,
  InvalidStatusTransitionError,
  BarberNotFoundError,
} from "./errors";

// O Brasil não tem mais horário de verão desde 2019, então o offset de
// Brasília (America/Sao_Paulo) é fixo em UTC-3 o ano inteiro — não
// precisa de biblioteca de timezone para lidar com isso. Os horários
// salvos em Availability.startTime/endTime ("09:00", "18:00") são
// horário LOCAL da barbearia, não UTC, e essa constante converte entre
// os dois nos dois pontos onde isso é necessário: cálculo de slots
// livres e validação de novo agendamento.
const SHOP_UTC_OFFSET_HOURS = 3;
const MIN_CANCEL_NOTICE_HOURS = 2;
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
  const [service, barber] = await Promise.all([
    prisma.service.findUnique({ where: { id: input.serviceId } }),
    prisma.user.findUnique({ where: { id: input.barberId }, select: { branchId: true } }),
  ]);

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
              // Unidade é sempre derivada do barbeiro no servidor, nunca
              // aceita do cliente — evita que alguém manipule o request
              // e grave um agendamento numa unidade diferente da real.
              branchId: barber?.branchId ?? null,
              startsAt,
              endsAt,
              priceAtBooking: service.price,
              status: "SCHEDULED",
            },
            include: {
              service: true,
              barber: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
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
  const [service, barber] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.user.findFirst({ where: { id: barberId, role: "BARBER", active: true } }),
  ]);

  if (!service || !service.active) {
    throw new InvalidServiceError();
  }
  if (!barber) {
    throw new BarberNotFoundError();
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

export interface ListAppointmentsFilters {
  from?: Date;
  to?: Date;
  status?: string;
}

/**
 * Lista agendamentos respeitando o recorte "row-level" por papel: OWNER
 * vê tudo, BARBER só os próprios, CLIENT só os próprios. O middleware já
 * garante que a role pode acessar a rota — este filtro garante que ela
 * não veja dados de outros usuários da mesma role.
 */
export async function listAppointmentsForUser(
  userId: string,
  role: string,
  filters: ListAppointmentsFilters
) {
  const dateFilter: Prisma.AppointmentWhereInput =
    filters.from && filters.to ? { startsAt: { gte: filters.from, lte: filters.to } } : {};

  const statusFilter: Prisma.AppointmentWhereInput = filters.status
    ? { status: filters.status as Prisma.EnumAppointmentStatusFilter["equals"] }
    : {};

  const roleFilter: Prisma.AppointmentWhereInput =
    role === "OWNER" ? {} : role === "BARBER" ? { barberId: userId } : { clientId: userId };

  return prisma.appointment.findMany({
    where: { ...roleFilter, ...dateFilter, ...statusFilter },
    include: {
      service: { select: { name: true, durationMin: true, price: true } },
      barber: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, phone: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function getAppointmentById(id: string, userId: string, role: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
      barber: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, phone: true } },
      branch: { select: { id: true, name: true } },
    },
  });

  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  const canView =
    role === "OWNER" || appointment.clientId === userId || appointment.barberId === userId;

  if (!canView) {
    throw new AppointmentAccessDeniedError();
  }

  return appointment;
}

/**
 * Atualiza o status de um agendamento aplicando as regras de negócio por
 * papel:
 * - CLIENT só pode cancelar o próprio, respeitando antecedência mínima.
 * - BARBER pode confirmar, completar ou marcar falta dos seus próprios.
 * - OWNER pode qualquer transição.
 */
export async function updateAppointmentStatus(
  id: string,
  userId: string,
  role: string,
  input: UpdateAppointmentStatusInput
) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  const isOwnerOfAppointment =
    (role === "CLIENT" && appointment.clientId === userId) ||
    (role === "BARBER" && appointment.barberId === userId);

  if (role !== "OWNER" && !isOwnerOfAppointment) {
    throw new AppointmentAccessDeniedError();
  }

  if (role === "CLIENT") {
    if (input.status !== "CANCELLED") {
      throw new InvalidStatusTransitionError("Cliente só pode cancelar agendamentos");
    }
    if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(appointment.status)) {
      throw new InvalidStatusTransitionError("Este agendamento não pode mais ser cancelado");
    }
    const hoursUntil = (appointment.startsAt.getTime() - Date.now()) / 3_600_000;
    if (hoursUntil < MIN_CANCEL_NOTICE_HOURS) {
      throw new InvalidStatusTransitionError(
        `Cancelamento só é permitido com no mínimo ${MIN_CANCEL_NOTICE_HOURS}h de antecedência`
      );
    }
  }

  if (role === "BARBER" && input.status === "CANCELLED") {
    throw new InvalidStatusTransitionError(
      "Barbeiro deve usar NO_SHOW em vez de CANCELLED para ausência do cliente"
    );
  }

  return prisma.appointment.update({
    where: { id },
    data: { status: input.status },
    include: {
      service: true,
      barber: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });
}
