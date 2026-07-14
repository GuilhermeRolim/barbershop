import cron from "node-cron";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT ?? 587),
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

/**
 * Roda a cada 15 minutos, busca agendamentos que começam em ~24h e ainda
 * não foram lembrados (campo remindedAt garante idempotência — sem ele,
 * o mesmo agendamento seria lembrado a cada execução dentro da janela).
 */
export function startReminderJob(): void {
  cron.schedule("*/15 * * * *", async () => {
    const windowStart = new Date(Date.now() + 23.5 * 3_600_000);
    const windowEnd = new Date(Date.now() + 24.5 * 3_600_000);

    const upcoming = await prisma.appointment.findMany({
      where: {
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        startsAt: { gte: windowStart, lte: windowEnd },
        remindedAt: null,
      },
      include: { client: true, barber: true, service: true },
    });

    for (const appt of upcoming) {
      try {
        await transporter.sendMail({
          from: '"Barbearia" <no-reply@barbearia.com>',
          to: appt.client.email,
          subject: "Lembrete de agendamento",
          text: `Olá ${appt.client.name}, você tem ${appt.service.name} com ${appt.barber.name} amanhã às ${appt.startsAt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`,
        });

        await prisma.appointment.update({
          where: { id: appt.id },
          data: { remindedAt: new Date() },
        });
      } catch (err) {
        // Falha de envio individual não deve derrubar o job para os demais.
        console.error(`Falha ao enviar lembrete para ${appt.client.email}:`, err);
      }
    }
  });

  console.log("Reminder job iniciado (execução a cada 15 minutos)");
}
