import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { AppShell } from "@/components/layout/AppShell";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  return (
    <AppShell role="OWNER" email={user.email}>
      {children}
    </AppShell>
  );
}
