import { NextRequest, NextResponse } from "next/server";
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

/**
 * GET /api/cron/reminders — chamada automaticamente pela Vercel Cron
 * (configurado em vercel.json) uma vez por dia. Não é chamada pelo
 * navegador nem por nenhuma tela do app.
 *
 * Por que isso substitui o antigo reminder.job.ts baseado em node-cron:
 * funções serverless da Vercel não ficam de pé entre requisições — um
 * `cron.schedule(...)` chamado dentro delas nunca dispara de verdade,
 * porque o processo Node.js é encerrado assim que a resposta é enviada.
 * A forma correta é a própria Vercel invocar uma rota HTTP no horário
 * configurado, o que é exatamente o que este endpoint faz.
 *
 * O plano Hobby da Vercel permite no máximo 1 execução de cron por dia,
 * então a janela de busca é "agendamentos que começam amanhã" (calendário
 * de Brasília), em vez de uma janela móvel de 24h checada a cada 15min.
 */
export async function GET(req: NextRequest) {
  // Só a própria Vercel deve conseguir disparar isso — sem essa checagem,
  // qualquer pessoa poderia bater nesse endpoint publicamente e forçar
  // envio de e-mails em massa. A Vercel envia esse header automaticamente
  // quando CRON_SECRET está configurado nas variáveis de ambiente.
  const authHeader = req.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

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

  return NextResponse.json({ checked: upcoming.length, sent, failed });
}
