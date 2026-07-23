import { prisma } from "@/lib/db";

/**
 * Lista o catálogo de serviços ativos, cada um com os barbeiros ativos
 * que o executam. Quando branchId é informado, só retorna barbeiros
 * daquela unidade — usado pela tela de agendamento do cliente depois
 * que ele escolhe a unidade.
 */
export async function listServicesWithBarbers(branchId?: string) {
  const services = await prisma.service.findMany({
    where: { active: true },
    include: {
      barberServices: {
        include: {
          barber: { select: { id: true, name: true, active: true, branchId: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    price: s.price,
    barbers: s.barberServices
      .filter((bs) => bs.barber.active && (!branchId || bs.barber.branchId === branchId))
      .map((bs) => ({ id: bs.barber.id, name: bs.barber.name })),
  }));
}
