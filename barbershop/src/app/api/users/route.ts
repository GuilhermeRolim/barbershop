import { NextResponse } from "next/server";
import { listUsers } from "@/modules/users/service";

// GET /api/users — protegido pelo middleware (só OWNER acessa).
export async function GET() {
  const users = await listUsers();
  return NextResponse.json({ users });
}
