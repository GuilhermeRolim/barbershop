import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["OWNER", "BARBER", "CLIENT"]),
  // Só relevante quando role = BARBER; null limpa o vínculo (ex: ao
  // rebaixar um barbeiro para CLIENT).
  branchId: z.string().cuid().nullable().optional(),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
