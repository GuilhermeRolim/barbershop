import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAvailableSlots, InvalidServiceError } from "@/services/appointment.service";

const querySchema = z.object({
  barberId: z.string().cuid(),
  serviceId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD"),
});

// GET /api/availability?barberId=...&serviceId=...&date=2026-07-15
// Retorna a lista de horários (ISO 8601) que o cliente pode escolher.
// Rota pública em termos de dado (qualquer role autenticada acessa),
// já protegida pelo middleware apenas quanto à autenticação.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    barberId: searchParams.get("barberId"),
    serviceId: searchParams.get("serviceId"),
    date: searchParams.get("date"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const barber = await prisma.user.findFirst({
    where: { id: parsed.data.barberId, role: "BARBER", active: true },
  });
  if (!barber) {
    return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
  }

  try {
    const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
    const slots = await getAvailableSlots(parsed.data.barberId, parsed.data.serviceId, date);
    return NextResponse.json({ slots });
  } catch (err) {
    if (err instanceof InvalidServiceError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("Erro ao calcular disponibilidade:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
