import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/users — protegido pelo middleware (só OWNER acessa).
// Lista todos os usuários para a tela de administração poder exibir
// quem existe e permitir promover/rebaixar papéis via
// /api/users/[id]/role.
export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}
