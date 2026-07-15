import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateAppointmentStatusSchema } from "@/lib/validations/appointment";

const MIN_CANCEL_NOTICE_HOURS = 2;

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");
  if (!userId || !role) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
      barber: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const canView =
    role === "OWNER" || appointment.clientId === userId || appointment.barberId === userId;

  if (!canView) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  return NextResponse.json({ appointment });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");
  if (!userId || !role) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido (JSON malformado)" }, { status: 400 });
  }

  const parsed = updateAppointmentStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const isOwnerOfAppointment =
    (role === "CLIENT" && appointment.clientId === userId) ||
    (role === "BARBER" && appointment.barberId === userId);

  if (role !== "OWNER" && !isOwnerOfAppointment) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  // Regras de negócio por role:
  // - CLIENT só pode cancelar o próprio agendamento, respeitando antecedência mínima.
  // - BARBER pode confirmar, completar ou marcar no-show dos seus próprios agendamentos.
  // - OWNER pode qualquer transição de status.
  if (role === "CLIENT") {
    if (parsed.data.status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Cliente só pode cancelar agendamentos" },
        { status: 403 }
      );
    }
    if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(appointment.status)) {
      return NextResponse.json(
        { error: "Este agendamento não pode mais ser cancelado" },
        { status: 422 }
      );
    }
    const hoursUntil = (appointment.startsAt.getTime() - Date.now()) / 3_600_000;
    if (hoursUntil < MIN_CANCEL_NOTICE_HOURS) {
      return NextResponse.json(
        {
          error: `Cancelamento só é permitido com no mínimo ${MIN_CANCEL_NOTICE_HOURS}h de antecedência`,
        },
        { status: 422 }
      );
    }
  }

  if (role === "BARBER" && parsed.data.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Barbeiro deve usar NO_SHOW em vez de CANCELLED para ausência do cliente" },
      { status: 422 }
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: parsed.data.status },
    include: {
      service: true,
      barber: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ appointment: updated });
}
