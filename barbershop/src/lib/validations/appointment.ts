import { z } from "zod";

export const createAppointmentSchema = z.object({
  barberId: z.string().cuid(),
  serviceId: z.string().cuid(),
  startsAt: z.string().datetime(), // ISO 8601, ex: "2026-07-15T14:00:00.000Z"
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
