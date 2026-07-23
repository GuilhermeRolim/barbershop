import { NextRequest, NextResponse } from "next/server";
import {
  createAppointment,
  listAppointmentsForUser,
} from "@/modules/appointments/service";
import { createAppointmentSchema } from "@/modules/appointments/validation";
import {
  AppointmentConflictError,
  OutsideAvailabilityError,
  InvalidServiceError,
  PastDateError,
} from "@/modules/appointments/errors";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");

  if (!userId || !role) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const statusParam = searchParams.get("status");

  const parsedFrom = from ? new Date(from) : undefined;
  const parsedTo = to ? new Date(to) : undefined;
  if ((from && Number.isNaN(parsedFrom?.getTime())) || (to && Number.isNaN(parsedTo?.getTime()))) {
    return NextResponse.json({ error: "Parâmetros 'from'/'to' inválidos" }, { status: 400 });
  }

  const appointments = await listAppointmentsForUser(userId, role, {
    from: parsedFrom,
    to: parsedTo,
    status: statusParam ?? undefined,
  });

  return NextResponse.json({ appointments });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");

  if (!userId || !role) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Apenas clientes marcam para si mesmos via esta rota; dono/barbeiro
  // que precisem marcar em nome de um cliente usariam um endpoint
  // administrativo separado (mesmo padrão, com clientId explícito no body).
  if (role !== "CLIENT") {
    return NextResponse.json(
      { error: "Apenas clientes podem criar agendamentos por esta rota" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido (JSON malformado)" }, { status: 400 });
  }

  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const appointment = await createAppointment(userId, parsed.data);
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    if (err instanceof AppointmentConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof OutsideAvailabilityError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof InvalidServiceError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof PastDateError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("Erro ao criar agendamento:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
