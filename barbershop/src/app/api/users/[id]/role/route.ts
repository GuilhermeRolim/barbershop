import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

const updateRoleSchema = z.object({
  role: z.enum(["OWNER", "BARBER", "CLIENT"]),
});

// PATCH /api/users/[id]/role — protegido pelo middleware: só OWNER acessa
// (prefixo /api/users está em ROUTE_RULES com roles: ["OWNER"]).
//
// Existe pra resolver um problema real: antes deste endpoint, promover
// alguém a barbeiro ou dono só era possível rodando UPDATE direto no
// banco de produção via SQL Editor do Neon — arriscado e nada
// autosserviço. Agora o próprio dono resolve isso pela interface (uma
// tela de administração de usuários pode consumir este endpoint).
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const actingUserId = req.headers.get("x-user-id");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido (JSON malformado)" }, { status: 400 });
  }

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Papel inválido. Use OWNER, BARBER ou CLIENT." },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  // Impede que o dono se auto-rebaixe por engano e fique trancado fora
  // da própria área administrativa (não há outro OWNER pra reverter isso
  // sem SQL, o que reintroduziria exatamente o problema que este endpoint
  // resolve).
  if (targetUser.id === actingUserId && parsed.data.role !== "OWNER") {
    return NextResponse.json(
      { error: "Você não pode remover seu próprio papel de dono por aqui" },
      { status: 422 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: parsed.data.role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ user: updated });
}
