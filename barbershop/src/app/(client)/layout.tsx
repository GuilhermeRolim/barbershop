import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { AppShell } from "@/components/layout/AppShell";

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  // Defesa em profundidade: o middleware já bloqueia /agendar sem sessão,
  // mas o layout não deve assumir isso — evita renderizar o shell com
  // `user` nulo caso o middleware seja alterado/bypassado no futuro.
  if (!user) {
    redirect("/login?redirect=/agendar");
  }

  return (
    <AppShell role="CLIENT" email={user.email}>
      {children}
    </AppShell>
  );
}
