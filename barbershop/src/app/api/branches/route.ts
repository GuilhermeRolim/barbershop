import { NextResponse } from "next/server";
import { listActiveBranches } from "@/modules/branches/service";

// GET /api/branches — lista as unidades ativas, usadas na tela de
// seleção de unidade do cliente e nos filtros/administração do dono.
export async function GET() {
  const branches = await listActiveBranches();
  return NextResponse.json({ branches });
}
