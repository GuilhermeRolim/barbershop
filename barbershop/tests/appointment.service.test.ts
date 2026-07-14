import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo de banco ANTES de importar o service, para que o service
// importe a versão mockada de `prisma`.
vi.mock("@/lib/db", () => ({
  prisma: {
    service: { findUnique: vi.fn() },
    availability: { findFirst: vi.fn() },
    appointment: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import {
  createAppointment,
  AppointmentConflictError,
  OutsideAvailabilityError,
  InvalidServiceError,
  PastDateError,
} from "@/services/appointment.service";

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

  it("lança OutsideAvailabilityError quando o horário é fora da janela de trabalho", async () => {
    vi.mocked(prisma.service.findUnique).mockResolvedValue(mockService as never);
    vi.mocked(prisma.availability.findFirst).mockResolvedValue({
      id: "avail-1",
      barberId: "barber-1",
      weekday: 4,
      startTime: "09:00",
      endTime: "18:00",
    } as never);

    // 20:00 está fora da janela 09:00-18:00
    await expect(
      createAppointment("client-1", {
        barberId: "barber-1",
        serviceId: "svc-1",
        startsAt: "2026-07-16T20:00:00.000Z",
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

    const result = await createAppointment("client-1", {
      barberId: "barber-1",
      serviceId: "svc-1",
      startsAt: "2026-07-16T14:00:00.000Z",
    });

    expect(result).toEqual(createdAppointment);
  });
});
