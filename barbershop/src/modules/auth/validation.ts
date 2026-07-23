import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(100),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha precisa de no mínimo 8 caracteres"),
  phone: z.string().optional(),
  // Registro público NUNCA aceita "role" — role sempre nasce como CLIENT.
  // Promoção a BARBER/OWNER só acontece via endpoint administrativo.
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});
export type LoginInput = z.infer<typeof loginSchema>;
