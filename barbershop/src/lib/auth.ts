import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// Este arquivo só cuida de hash de senha (bcrypt), que só roda em rotas
// de API (Node.js runtime). A lógica de token JWT foi movida para
// jwt.ts, que é seguro de importar também no middleware (Edge Runtime).
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type { JwtPayload } from "./jwt";
export { signToken, verifyToken } from "./jwt";
