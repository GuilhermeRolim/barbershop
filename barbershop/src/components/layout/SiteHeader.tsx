import Link from "next/link";
import styles from "./SiteHeader.module.css";

interface SiteHeaderProps {
  /** Quando o usuário já está autenticado, mostra CTA para a área dele em vez de Entrar/Criar conta. */
  isAuthenticated?: boolean;
  authenticatedHref?: string;
}

export function SiteHeader({ isAuthenticated = false, authenticatedHref = "/" }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        Barbearia<span className={styles.brandDot}>.</span>
      </Link>

      <nav className={styles.nav}>
        {isAuthenticated ? (
          <Link href={authenticatedHref} className={styles.navLinkPrimary}>
            Minha área
          </Link>
        ) : (
          <>
            <Link href="/login" className={styles.navLink}>
              Entrar
            </Link>
            <Link href="/cadastro" className={styles.navLinkPrimary}>
              Criar conta
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
