/**
 * TESTE DE INTEGRAÇÃO — requer PostgreSQL real (via Testcontainers).
 *
 * Este é o teste mais importante do sistema: garante que, sob concorrência
 * real (duas requisições simultâneas para o MESMO barbeiro/horário), apenas
 * UMA tem sucesso. Testes unitários com mock NÃO pegam esse tipo de bug,
 * porque a race condition só existe com um banco de dados real por trás.
 *
 * Para rodar: npm run test -- appointment.concurrency
 * Requer Docker disponível na máquina (Testcontainers sobe um Postgres
 * efêmero automaticamente).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";

describe("createAppointment — concorrência real (Testcontainers)", () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();

    process.env.DATABASE_URL = container.getConnectionUri();

    // Aplica o schema no banco efêmero antes de rodar os testes.
    execSync("npx prisma db push --skip-generate", {
      env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
      stdio: "inherit",
    });

    prisma = new PrismaClient({ datasourceUrl: container.getConnectionUri() });

    // Seed mínimo: 1 barbeiro, 1 serviço, disponibilidade, 2 clientes.
    await prisma.user.createMany({
      data: [
        { id: "barber-1", name: "Barbeiro", email: "b@test.com", passwordHash: "x", role: "BARBER" },
        { id: "client-1", name: "Cliente 1", email: "c1@test.com", passwordHash: "x", role: "CLIENT" },
        { id: "client-2", name: "Cliente 2", email: "c2@test.com", passwordHash: "x", role: "CLIENT" },
      ],
    });
    await prisma.service.create({
      data: { id: "svc-1", name: "Corte", durationMin: 30, price: 40, active: true },
    });
    await prisma.availability.create({
      data: { barberId: "barber-1", weekday: new Date("2026-07-16T14:00:00.000Z").getUTCDay(), startTime: "09:00", endTime: "18:00" },
    });
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it("apenas UM agendamento simultâneo para o mesmo barbeiro/horário deve ter sucesso", async () => {
    // Importação dinâmica após o DATABASE_URL estar apontando para o container.
    const { createAppointment } = await import("@/modules/appointments/service");

    const startsAt = "2026-07-16T14:00:00.000Z";

    const results = await Promise.allSettled([
      createAppointment("client-1", { barberId: "barber-1", serviceId: "svc-1", startsAt }),
      createAppointment("client-2", { barberId: "barber-1", serviceId: "svc-1", startsAt }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const countInDb = await prisma.appointment.count({
      where: { barberId: "barber-1", startsAt: new Date(startsAt) },
    });
    expect(countInDb).toBe(1);
  });
});
