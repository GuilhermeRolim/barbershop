import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Protegida pelo middleware: apenas OWNER acessa /api/dashboard/*.
// Todo o dado aqui é AGREGADO em cima de Appointment.status === COMPLETED,
// nunca uma tabela financeira paralela — evita divergência de fonte de verdade.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : new Date(0);
  const to = toParam ? new Date(toParam) : new Date();

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Parâmetros 'from'/'to' inválidos" }, { status: 400 });
  }

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

  return NextResponse.json({
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
  });
}
