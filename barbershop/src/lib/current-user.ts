import { cookies } from "next/headers";
import { verifyToken, type JwtPayload } from "./auth";

/**
 * Lê e valida o JWT do cookie em Server Components / Server Actions.
 * Retorna null se não houver sessão válida — quem chama decide se
 * redireciona (o middleware já cobre a maioria dos casos de rota
 * protegida; isso é útil para páginas que exibem conteúdo condicional
 * sem bloquear o acesso, ex: home pública com botão de login/logout).
 */
export function getCurrentUser(): JwtPayload | null {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
