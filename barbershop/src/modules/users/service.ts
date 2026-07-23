import { prisma } from "@/lib/db";
import type { UpdateUserRoleInput } from "./validation";

export class UserNotFoundError extends Error {
  constructor(message = "Usuário não encontrado") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

export class SelfDemotionError extends Error {
  constructor(message = "Você não pode remover seu próprio papel de dono por aqui") {
    super(message);
    this.name = "SelfDemotionError";
  }
}

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Promove/rebaixa o papel de um usuário e, opcionalmente, vincula/desvincula
 * ele de uma unidade (relevante só para BARBER). Existe pra resolver um
 * problema real do projeto: antes deste endpoint, isso só era possível
 * rodando UPDATE direto no banco de produção via SQL manual.
 */
export async function updateUserRole(
  targetUserId: string,
  actingUserId: string | null,
  input: UpdateUserRoleInput
) {
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new UserNotFoundError();
  }

  // Impede que o dono se auto-rebaixe por engano e fique trancado fora
  // da própria área administrativa (não há outro OWNER pra reverter isso
  // sem SQL, o que reintroduziria exatamente o problema que este endpoint
  // resolve).
  if (targetUser.id === actingUserId && input.role !== "OWNER") {
    throw new SelfDemotionError();
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: {
      role: input.role,
      // Só barbeiros têm unidade; qualquer outro papel limpa o vínculo
      // para não deixar dado inconsistente pra trás.
      branchId: input.role === "BARBER" ? (input.branchId ?? null) : null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
    },
  });
}
