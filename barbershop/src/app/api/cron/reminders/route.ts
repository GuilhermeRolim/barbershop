import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendUpcomingAppointmentReminders } from "@/modules/notifications/service";

/**
 * GET /api/cron/reminders — chamada automaticamente pela Vercel Cron
 * (configurado em vercel.json) uma vez por dia. Não é chamada pelo
 * navegador nem por nenhuma tela do app.
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

  const result = await sendUpcomingAppointmentReminders();
  return NextResponse.json(result);
}
