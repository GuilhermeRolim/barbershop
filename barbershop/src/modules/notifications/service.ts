import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

// O Brasil não tem horário de verão desde 2019 — offset fixo de Brasília.
const SHOP_UTC_OFFSET_HOURS = 3;

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT ?? 587),
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export interface ReminderRunResult {
  checked: number;
  sent: number;
  failed: number;
}

/**
 * Envia lembrete por e-mail para todos os agendamentos SCHEDULED/CONFIRMED
 * que caem no dia seguinte (calendário de Brasília) e ainda não foram
 * lembrados. Chamada pela rota de cron (uma vez por dia, plano Hobby da
 * Vercel só permite essa frequência) — nunca pelo navegador.
 */
export async function sendUpcomingAppointmentReminders(): Promise<ReminderRunResult> {
  const nowLocal = new Date(Date.now() - SHOP_UTC_OFFSET_HOURS * 3_600_000);
  const tomorrowLocal = new Date(nowLocal);
  tomorrowLocal.setUTCDate(tomorrowLocal.getUTCDate() + 1);

  const windowStartLocal = new Date(tomorrowLocal);
  windowStartLocal.setUTCHours(0, 0, 0, 0);
  const windowEndLocal = new Date(tomorrowLocal);
  windowEndLocal.setUTCHours(23, 59, 59, 999);

  // Converte de volta para UTC (horário real armazenado no banco) somando
  // o offset, já que os cálculos acima foram feitos em "horário local
  // fingido como UTC" só para facilitar a aritmética de data.
  const windowStart = new Date(windowStartLocal.getTime() + SHOP_UTC_OFFSET_HOURS * 3_600_000);
  const windowEnd = new Date(windowEndLocal.getTime() + SHOP_UTC_OFFSET_HOURS * 3_600_000);

  const upcoming = await prisma.appointment.findMany({
    where: {
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startsAt: { gte: windowStart, lte: windowEnd },
      remindedAt: null,
    },
    include: { client: true, barber: true, service: true },
  });

  let sent = 0;
  let failed = 0;

  for (const appt of upcoming) {
    try {
      await transporter.sendMail({
        from: '"Barbearia" <no-reply@barbearia.com>',
        to: appt.client.email,
        subject: "Lembrete de agendamento amanhã",
        text: `Olá ${appt.client.name}, você tem ${appt.service.name} com ${appt.barber.name} amanhã às ${appt.startsAt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`,
      });

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { remindedAt: new Date() },
      });
      sent++;
    } catch (err) {
      // Falha de envio individual não deve impedir os demais lembretes.
      console.error(`Falha ao enviar lembrete para ${appt.client.email}:`, err);
      failed++;
    }
  }

  return { checked: upcoming.length, sent, failed };
}
