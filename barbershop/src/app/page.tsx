import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui";
import styles from "./home.module.css";

const ROLE_HOME: Record<string, string> = {
  OWNER: "/dashboard",
  BARBER: "/agenda",
  CLIENT: "/agendar",
};

export default async function HomePage() {
  const user = await getCurrentUser();
  const authenticatedHref = user ? ROLE_HOME[user.role] ?? "/agendar" : "/";

  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} authenticatedHref={authenticatedHref} />

      <Container width="sm" className={styles.hero}>
        <p className={styles.eyebrow}>Tradição &amp; navalha</p>
        <h1 className={styles.title}>Sua barbearia de confiança</h1>
        <p className={styles.subtitle}>
          Agende seu horário online com o barbeiro da sua preferência, sem filas e sem ligações.
        </p>

        {user ? (
          <Link href={authenticatedHref} className={styles.ctaPrimary}>
            Ir para minha área
          </Link>
        ) : (
          <div className={styles.ctaRow}>
            <Link href="/login" className={styles.ctaSecondary}>
              Entrar
            </Link>
            <Link href="/cadastro" className={styles.ctaPrimary}>
              Criar conta
            </Link>
          </div>
        )}
      </Container>
    </>
  );
}
