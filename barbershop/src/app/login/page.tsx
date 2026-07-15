"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button, Container, TextField } from "@/components/ui";
import styles from "./login.module.css";

const ROLE_HOME: Record<string, string> = {
  OWNER: "/dashboard",
  BARBER: "/agenda",
  CLIENT: "/agendar",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao entrar");
        return;
      }

      const redirect = searchParams.get("redirect");
      router.push(redirect ?? ROLE_HOME[data.user.role] ?? "/");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container width="sm">
      <h1 className={styles.title}>Entrar</h1>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} loadingText="Entrando...">
          Entrar
        </Button>
      </form>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<Container width="sm">Carregando...</Container>}>
        <LoginForm />
      </Suspense>
    </>
  );
}
