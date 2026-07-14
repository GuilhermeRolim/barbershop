import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Rota pública de leitura (catálogo de serviços ativos com os barbeiros
// que os executam) — usada pela tela de agendamento do cliente.
export async function GET() {
  const services = await prisma.service.findMany({
    where: { active: true },
    include: {
      barberServices: {
        include: { barber: { select: { id: true, name: true, active: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const formatted = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    price: s.price,
    barbers: s.barberServices
      .filter((bs) => bs.barber.active)
      .map((bs) => ({ id: bs.barber.id, name: bs.barber.name })),
  }));

  return NextResponse.json({ services: formatted });
}
