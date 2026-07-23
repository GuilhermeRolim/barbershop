import { NextRequest, NextResponse } from "next/server";
import { updateUserRole, UserNotFoundError, SelfDemotionError } from "@/modules/users/service";
import { updateUserRoleSchema } from "@/modules/users/validation";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/users/[id]/role — protegido pelo middleware (só OWNER acessa).
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const actingUserId = req.headers.get("x-user-id");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido (JSON malformado)" }, { status: 400 });
  }

  const parsed = updateUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const updated = await updateUserRole(id, actingUserId, parsed.data);
    return NextResponse.json({ user: updated });
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof SelfDemotionError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("Erro ao atualizar papel de usuário:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
