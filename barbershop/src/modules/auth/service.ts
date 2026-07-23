import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import { signToken, type JwtPayload } from "./jwt";
import type { RegisterInput, LoginInput } from "./validation";

export class EmailAlreadyRegisteredError extends Error {
  constructor(message = "E-mail já cadastrado") {
    super(message);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message = "Credenciais inválidas") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

interface AuthResult {
  token: string;
  user: { id: string; name: string; email: string; role: JwtPayload["role"] };
}

// Cadastro público SEMPRE cria role CLIENT — promoção a BARBER/OWNER só
// acontece via módulo users (endpoint administrativo), nunca por aqui.
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new EmailAlreadyRegisteredError();
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone,
      role: "CLIENT",
    },
  });

  const token = await signToken({ sub: user.id, role: user.role, email: user.email });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

// Mensagem de erro genérica de propósito tanto para e-mail inexistente
// quanto senha errada — evita enumeração de contas cadastradas.
export async function authenticateUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.active || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new InvalidCredentialsError();
  }

  const token = await signToken({ sub: user.id, role: user.role, email: user.email });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}
