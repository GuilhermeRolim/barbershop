import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// Isolado em arquivo próprio (não junto de jwt.ts) porque bcryptjs usa
// APIs Node.js puras incompatíveis com o Edge Runtime. Este arquivo só
// deve ser importado por código que roda em rotas de API (Node.js
// runtime) — nunca pelo middleware.ts.
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
