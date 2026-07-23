import { NextRequest, NextResponse } from "next/server";
import { getAppointmentById, updateAppointmentStatus } from "@/modules/appointments/service";
import { updateAppointmentStatusSchema } from "@/modules/appointments/validation";
import {
  AppointmentNotFoundError,
  AppointmentAccessDeniedError,
  InvalidStatusTransitionError,
} from "@/modules/appointments/errors";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");
  if (!userId || !role) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const appointment = await getAppointmentById(id, userId, role);
    return NextResponse.json({ appointment });
  } catch (err) {
    if (err instanceof AppointmentNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof AppointmentAccessDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Erro ao buscar agendamento:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
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

  try {
    const updated = await updateAppointmentStatus(id, userId, role, parsed.data);
    return NextResponse.json({ appointment: updated });
  } catch (err) {
    if (err instanceof AppointmentNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof AppointmentAccessDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof InvalidStatusTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("Erro ao atualizar agendamento:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
