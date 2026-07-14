import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";

const ROLE_HOME: Record<string, string> = {
  OWNER: "/dashboard",
  BARBER: "/agenda",
  CLIENT: "/agendar",
};

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main style={{ maxWidth: 640, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
      <h1>Barbearia</h1>
      <p>Agende seu horário online com o barbeiro da sua preferência.</p>

      {user ? (
        <Link
          href={ROLE_HOME[user.role] ?? "/agendar"}
          style={{ display: "inline-block", marginTop: 24, padding: "12px 24px", background: "#1a1a1a", color: "#fff", borderRadius: 6, textDecoration: "none" }}
        >
          Ir para minha área
        </Link>
      ) : (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
          <Link href="/login" style={{ padding: "12px 24px", border: "1px solid #1a1a1a", borderRadius: 6, textDecoration: "none", color: "#1a1a1a" }}>
            Entrar
          </Link>
          <Link href="/cadastro" style={{ padding: "12px 24px", background: "#1a1a1a", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
            Criar conta
          </Link>
        </div>
      )}
    </main>
  );
}
