import { NextRequest, NextResponse } from "next/server";
import { listServicesWithBarbers } from "@/modules/services-catalog/service";

// GET /api/services?branchId=... — catálogo de serviços ativos com os
// barbeiros que os executam. branchId filtra só os barbeiros daquela
// unidade; sem ele, retorna barbeiros de todas as unidades.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") ?? undefined;

  const services = await listServicesWithBarbers(branchId);
  return NextResponse.json({ services });
}
