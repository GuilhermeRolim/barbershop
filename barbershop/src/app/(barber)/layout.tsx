import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { AppShell } from "@/components/layout/AppShell";

export default async function BarberLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/agenda");
  }

  return (
    <AppShell role="BARBER" email={user.email}>
      {children}
    </AppShell>
  );
}
