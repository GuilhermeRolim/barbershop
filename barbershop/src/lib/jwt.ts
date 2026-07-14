import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { env } from "./env";

export interface JwtPayload {
  sub: string; // userId
  role: Role;
  email: string;
}

const secret = new TextEncoder().encode(env.JWT_SECRET);

// Este arquivo existe separado de auth.ts de propósito: o middleware.ts
// roda no Edge Runtime do Next.js, que não suporta bibliotecas baseadas
// em APIs Node.js puras (como jsonwebtoken ou bcryptjs). A lib `jose`
// usa Web Crypto API, compatível tanto com Edge quanto com Node.js —
// por isso é a única coisa que o middleware pode importar com segurança.
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
