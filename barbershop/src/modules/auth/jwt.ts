import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { env } from "@/lib/env";

export interface JwtPayload {
  sub: string; // userId
  role: Role;
  email: string;
}

const secret = new TextEncoder().encode(env.JWT_SECRET);

// ATENÇÃO — REGRA DE ARQUITETURA DESTE ARQUIVO:
// Isolado em modules/auth/jwt.ts, separado de password.ts e service.ts
// de propósito. O middleware.ts roda no Edge Runtime do Next.js, que
// não suporta bibliotecas baseadas em APIs Node.js puras (como
// jsonwebtoken ou bcryptjs). A lib `jose` usa Web Crypto API, compatível
// tanto com Edge quanto com Node.js.
//
// NUNCA importe bcrypt (password.ts) neste arquivo, e nunca reexporte
// este arquivo junto de password.ts por um barrel/index.ts comum — se o
// middleware importar (mesmo que indiretamente) algo que puxe bcryptjs
// para o bundle do Edge Runtime, o build pode falhar ou o comportamento
// em produção fica inconsistente. middleware.ts e current-user.ts devem
// importar DIRETAMENTE deste arquivo (@/modules/auth/jwt), nunca de
// @/modules/auth/service ou de um índice do módulo.
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

// Retorna null em vez de lançar exceção — quem chama decide o que fazer
// (redirecionar para login, retornar 401, etc). Evita try/catch espalhado.
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
