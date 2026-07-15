import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

// Mapa de prefixo de rota -> roles permitidas.
// Rotas /api/* não listadas aqui passam sem checagem de role no middleware
// (mas ainda podem exigir autenticação dentro do próprio handler).
const ROUTE_RULES: { prefix: string; roles: string[] }[] = [
  { prefix: "/dashboard", roles: ["OWNER"] },
  { prefix: "/agenda", roles: ["OWNER", "BARBER"] },
  { prefix: "/agendar", roles: ["OWNER", "BARBER", "CLIENT"] },
  { prefix: "/api/dashboard", roles: ["OWNER"] },
  { prefix: "/api/appointments", roles: ["OWNER", "BARBER", "CLIENT"] },
  { prefix: "/api/availability", roles: ["OWNER", "BARBER", "CLIENT"] },
  { prefix: "/api/users", roles: ["OWNER"] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rule = ROUTE_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")
  );

  if (!rule) return NextResponse.next();

  const token = req.cookies.get("token")?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!rule.roles.includes(payload.role)) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/nao-autorizado", req.url));
  }

  // Repassa a identidade para os handlers via header, evitando
  // decodificar o JWT de novo em cada route.ts.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-email", payload.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agenda/:path*",
    "/agendar/:path*",
    "/api/appointments/:path*",
    "/api/dashboard/:path*",
    "/api/availability/:path*",
    "/api/users/:path*",
  ],
};
