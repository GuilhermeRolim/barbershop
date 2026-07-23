import { NextRequest, NextResponse } from "next/server";
import { registerUser, EmailAlreadyRegisteredError } from "@/modules/auth/service";
import { registerSchema } from "@/modules/auth/validation";

// Adaptador HTTP fino: parseia/valida request, chama o módulo, mapeia
// erros de domínio para status HTTP, seta o cookie de sessão. Toda a
// regra de negócio (checar duplicidade, hash, emissão do token) vive em
// modules/auth/service.ts — não aqui.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido (JSON malformado)" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const { token, user } = await registerUser(parsed.data);

    const res = NextResponse.json({ user }, { status: 201 });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });
    return res;
  } catch (err) {
    if (err instanceof EmailAlreadyRegisteredError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Erro ao registrar usuário:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
