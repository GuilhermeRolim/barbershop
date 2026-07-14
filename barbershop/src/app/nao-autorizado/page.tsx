import Link from "next/link";

export default function NaoAutorizadoPage() {
  return (
    <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
      <h1>Acesso não autorizado</h1>
      <p>Você não tem permissão para acessar esta página.</p>
      <Link href="/">Voltar ao início</Link>
    </main>
  );
}
