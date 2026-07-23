import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo de banco ANTES de importar o service, para que o service
// importe a versão mockada de `prisma`.
vi.mock("@/lib/db", () => ({
  prisma: {
    service: { findUnique: vi.fn() },
    // Usado pelo service para descobrir a unidade (branch) do barbeiro
    // ao criar o agendamento — precisa estar mockado mesmo quando o
    // teste não se importa com unidades, senão a chamada quebra.
    user: { findUnique: vi.fn() },
    availability: { findFirst: vi.fn() },
    appointment: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { createAppointment } from "@/modules/appointments/service";
import {
  AppointmentConflictError,
  OutsideAvailabilityError,
  InvalidServiceError,
  PastDateError,
} from "@/modules/appointments/errors";

const FIXED_NOW = new Date("2026-07-15T12:00:00.000Z"); // uma quarta-feira

const mockService = {
  id: "svc-1",
  name: "Corte",
  durationMin: 30,
  price: 40,
  active: true,
};

describe("createAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    // Padrão: barbeiro sem unidade vinculada, a menos que um teste
    // específico sobrescreva isso.
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ branchId: null } as never);
  });

  it("lança InvalidServiceError quando o serviço não existe", async () => {
    vi.mocked(prisma.service.findUnique).mockResolvedValue(null);

    await expect(
      createAppointment("client-1", {
        barberId: "barber-1",
        serviceId: "svc-inexistente",
        startsAt: "2026-07-16T14:00:00.000Z",
      })
    ).rejects.toThrow(InvalidServiceError);
  });

  it("lança PastDateError quando a data está no passado", async () => {
    vi.mocked(prisma.service.findUnique).mockResolvedValue(mockService as never);

    await expect(
      createAppointment("client-1", {
        barberId: "barber-1",
        serviceId: "svc-1",
        startsAt: "2026-07-14T14:00:00.000Z", // antes de FIXED_NOW
      })
    ).rejects.toThrow(PastDateError);
  });

  it("lança OutsideAvailabilityError quando não há disponibilidade cadastrada", async () => {
    vi.mocked(prisma.service.findUnique).mockResolvedValue(mockService as never);
    vi.mocked(prisma.availability.findFirst).mockResolvedValue(null);

    await expect(
      createAppointment("client-1", {
        barberId: "barber-1",
        serviceId: "svc-1",
        startsAt: "2026-07-16T14:00:00.000Z",
      })
    ).rejects.toThrow(OutsideAvailabilityError);
  });

  it("lança OutsideAvailabilityError quando o horário é fora da janela de trabalho (horário local de Brasília)", async () => {
    vi.mocked(prisma.service.findUnique).mockResolvedValue(mockService as never);
    vi.mocked(prisma.availability.findFirst).mockResolvedValue({
      id: "avail-1",
      barberId: "barber-1",
      weekday: 4,
      startTime: "09:00",
      endTime: "18:00",
    } as never);

    // 23:00 UTC = 20:00 em Brasília (UTC-3) — fora da janela 09:00-18:00
    // local. Importante usar um horário que reflita corretamente a
    // conversão de fuso, já que o service compara contra horário LOCAL
    // da barbearia, não UTC bruto.
    await expect(
      createAppointment("client-1", {
        barberId: "barber-1",
        serviceId: "svc-1",
        startsAt: "2026-07-16T23:00:00.000Z",
      })
    ).rejects.toThrow(OutsideAvailabilityError);
  });

  it("lança AppointmentConflictError quando há sobreposição de horário", async () => {
    vi.mocked(prisma.service.findUnique).mockResolvedValue(mockService as never);
    vi.mocked(prisma.availability.findFirst).mockResolvedValue({
      id: "avail-1",
      barberId: "barber-1",
      weekday: 4,
      startTime: "09:00",
      endTime: "18:00",
    } as never);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        appointment: {
          findFirst: vi.fn().mockResolvedValue({ id: "existing-appt" }), // simula conflito
          create: vi.fn(),
        },
      };
      return (fn as (tx: unknown) => Promise<unknown>)(tx);
    });

    // 14:00 UTC = 11:00 em Brasília — dentro da janela 09:00-18:00 local.
    await expect(
      createAppointment("client-1", {
        barberId: "barber-1",
        serviceId: "svc-1",
        startsAt: "2026-07-16T14:00:00.000Z",
      })
    ).rejects.toThrow(AppointmentConflictError);
  });

  it("cria o agendamento com sucesso quando não há conflito", async () => {
    vi.mocked(prisma.service.findUnique).mockResolvedValue(mockService as never);
    vi.mocked(prisma.availability.findFirst).mockResolvedValue({
      id: "avail-1",
      barberId: "barber-1",
      weekday: 4,
      startTime: "09:00",
      endTime: "18:00",
    } as never);

    const createdAppointment = {
      id: "appt-1",
      barberId: "barber-1",
      clientId: "client-1",
      serviceId: "svc-1",
      status: "SCHEDULED",
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        appointment: {
          findFirst: vi.fn().mockResolvedValue(null), // sem conflito
          create: vi.fn().mockResolvedValue(createdAppointment),
        },
      };
      return (fn as (tx: unknown) => Promise<unknown>)(tx);
    });

    // 14:00 UTC = 11:00 em Brasília — dentro da janela 09:00-18:00 local.
    const result = await createAppointment("client-1", {
      barberId: "barber-1",
      serviceId: "svc-1",
      startsAt: "2026-07-16T14:00:00.000Z",
    });

    expect(result).toEqual(createdAppointment);
  });
});
