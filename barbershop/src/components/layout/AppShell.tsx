"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import styles from "./AppShell.module.css";

export type AppRole = "OWNER" | "BARBER" | "CLIENT";

const ROLE_LABEL: Record<AppRole, string> = {
  OWNER: "Proprietário",
  BARBER: "Barbeiro",
  CLIENT: "Cliente",
};

const NAV_BY_ROLE: Record<AppRole, { href: string; label: string }[]> = {
  OWNER: [{ href: "/dashboard", label: "Dashboard" }],
  BARBER: [{ href: "/agenda", label: "Minha agenda" }],
  CLIENT: [{ href: "/agendar", label: "Agendar" }],
};

interface AppShellProps {
  role: AppRole;
  email: string;
  children: ReactNode;
}

/**
 * Casca de layout para as áreas autenticadas. Recebe `role`/`email` de um
 * Server Component pai (que já leu o JWT via getCurrentUser()) — assim o
 * shell não precisa refazer a leitura de cookies no cliente, só cuida de
 * interação (logout, destaque de link ativo).
 */
export function AppShell({ role, email, children }: AppShellProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const navItems = NAV_BY_ROLE[role];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Barbearia<span className={styles.brandDot}>.</span>
        </Link>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.userArea}>
          <div className={styles.userInfo}>
            <span className={styles.roleLabel}>{ROLE_LABEL[role]}</span>
            <span className={styles.email}>{email}</span>
          </div>
          <button className={styles.logoutButton} onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Saindo..." : "Sair"}
          </button>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
