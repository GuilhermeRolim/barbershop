"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button, Card, Container, TextField } from "@/components/ui";
import { ROLE_HOME } from "@/lib/role-home";
import styles from "./login.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

      const data: { error?: string; user?: { role: keyof typeof ROLE_HOME } } = await res.json();

      if (!res.ok || !data.user) {
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
    <Container width="sm" className={styles.wrap}>
      <Card className={styles.authCard}>
        <p className={styles.eyebrow}>De volta</p>
        <h1 className={styles.title}>Entrar</h1>
        <p className={styles.subtitle}>Acesse sua conta pra ver ou marcar um horário.</p>

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
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            endAdornment={
              <button
                type="button"
                className={styles.toggleVisibility}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            }
          />

          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} loadingText="Entrando..." className={styles.submitButton}>
            Entrar
          </Button>
        </form>

        <p className={styles.switchLine}>
          Não tem conta? <Link href="/cadastro">Criar conta</Link>
        </p>
      </Card>
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
