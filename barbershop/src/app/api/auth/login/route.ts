import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, InvalidCredentialsError } from "@/modules/auth/service";
import { loginSchema } from "@/modules/auth/validation";

// Rate limiting simples em memória — adequado para 1 instância/dev.
// Em produção com múltiplas instâncias (serverless), trocar por
// Upstash Redis (@upstash/ratelimit), pois cada instância aqui tem
// seu próprio Map isolado. Fica aqui no adaptador (não no módulo)
// porque é uma preocupação de infraestrutura HTTP, não de domínio.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido (JSON malformado)" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  if (isRateLimited(parsed.data.email)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em 15 minutos." },
      { status: 429 }
    );
  }

  try {
    const { token, user } = await authenticateUser(parsed.data);

    const res = NextResponse.json({ user });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Erro ao autenticar usuário:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
