import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "./env";

const SALT_ROUNDS = 12;

export interface JwtPayload {
  sub: string; // userId
  role: Role;
  email: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: JwtPayload): string {
  // O cast é seguro aqui: JWT_EXPIRES_IN é validado no schema Zod (env.ts)
  // e sempre recebe um valor no formato aceito pela lib (ex: "7d", "1h"),
  // mas o TypeScript não consegue inferir isso a partir de um `string` genérico.
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

// Retorna null em vez de lançar exceção — quem chama decide o que fazer
// (redirecionar para login, retornar 401, etc). Evita try/catch espalhado.
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
