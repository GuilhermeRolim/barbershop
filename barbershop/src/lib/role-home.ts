import type { Role } from "@prisma/client";

/**
 * Mapa único de "para onde levar o usuário depois de autenticado",
 * usado pela home page, tela de login e qualquer outro lugar que
 * precise decidir a área inicial de um usuário pelo papel dele.
 * Extraído aqui porque antes vivia duplicado em src/app/page.tsx e
 * src/app/login/page.tsx — mudar uma rota exigia lembrar de editar
 * os dois lugares.
 */
export const ROLE_HOME: Record<Role, string> = {
  OWNER: "/dashboard",
  BARBER: "/agenda",
  CLIENT: "/agendar",
};
