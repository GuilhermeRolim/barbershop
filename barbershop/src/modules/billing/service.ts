import { prisma } from "@/lib/db";

/**
 * Todo o dado aqui é AGREGADO em cima de Appointment.status === COMPLETED,
 * nunca uma tabela financeira paralela — evita divergência de fonte de
 * verdade entre "o que foi cobrado" e "o que o financeiro mostra".
 */
export async function getFinancialSummary(from: Date, to: Date) {
  const [totals, porBarbeiroRaw, porServicoRaw, cancelamentos] = await Promise.all([
    prisma.appointment.aggregate({
      where: { status: "COMPLETED", startsAt: { gte: from, lte: to } },
      _sum: { priceAtBooking: true },
      _count: true,
    }),
    prisma.appointment.groupBy({
      by: ["barberId"],
      where: { status: "COMPLETED", startsAt: { gte: from, lte: to } },
      _sum: { priceAtBooking: true },
      _count: true,
    }),
    prisma.appointment.groupBy({
      by: ["serviceId"],
      where: { status: "COMPLETED", startsAt: { gte: from, lte: to } },
      _sum: { priceAtBooking: true },
      _count: true,
    }),
    prisma.appointment.count({
      where: { status: { in: ["CANCELLED", "NO_SHOW"] }, startsAt: { gte: from, lte: to } },
    }),
  ]);

  // Enriquecer os agrupamentos com nome do barbeiro/serviço
  // (groupBy do Prisma não faz include, então resolvemos em batch).
  const barberIds = porBarbeiroRaw.map((b) => b.barberId);
  const serviceIds = porServicoRaw.map((s) => s.serviceId);

  const [barbers, services] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: barberIds } }, select: { id: true, name: true } }),
    prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } }),
  ]);

  const barberMap = new Map(barbers.map((b) => [b.id, b.name]));
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));

  return {
    periodo: { from: from.toISOString(), to: to.toISOString() },
    receitaTotal: totals._sum.priceAtBooking ?? 0,
    atendimentosConcluidos: totals._count,
    cancelamentosENoShow: cancelamentos,
    porBarbeiro: porBarbeiroRaw.map((b) => ({
      barberId: b.barberId,
      barberName: barberMap.get(b.barberId) ?? "Desconhecido",
      receita: b._sum.priceAtBooking ?? 0,
      atendimentos: b._count,
    })),
    porServico: porServicoRaw.map((s) => ({
      serviceId: s.serviceId,
      serviceName: serviceMap.get(s.serviceId) ?? "Desconhecido",
      receita: s._sum.priceAtBooking ?? 0,
      atendimentos: s._count,
    })),
  };
}
