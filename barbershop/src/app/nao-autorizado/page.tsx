import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui";
import styles from "./nao-autorizado.module.css";

export default function NaoAutorizadoPage() {
  return (
    <>
      <SiteHeader />
      <Container width="sm" className={styles.wrap}>
        <h1>Acesso não autorizado</h1>
        <p className={styles.text}>Você não tem permissão para acessar esta página.</p>
        <Link href="/" className={styles.link}>
          Voltar ao início
        </Link>
      </Container>
    </>
  );
}
