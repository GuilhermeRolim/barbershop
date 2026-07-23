import { NextRequest, NextResponse } from "next/server";
import { getFinancialSummary } from "@/modules/billing/service";

// Protegida pelo middleware: apenas OWNER acessa /api/dashboard/*.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : new Date(0);
  const to = toParam ? new Date(toParam) : new Date();

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Parâmetros 'from'/'to' inválidos" }, { status: 400 });
  }

  const summary = await getFinancialSummary(from, to);
  return NextResponse.json(summary);
}
