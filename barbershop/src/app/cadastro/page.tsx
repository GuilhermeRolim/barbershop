"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button, Card, Container, TextField } from "@/components/ui";
import styles from "../login/login.module.css"; // mesmo layout de formulário de auth

function passwordHelperText(password: string): string {
  if (password.length === 0) return "Use ao menos 8 caracteres.";
  if (password.length < 8) return `Faltam ${8 - password.length} caractere(s).`;
  return "✓ Senha válida.";
}

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordValid = form.password.length >= 8;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao cadastrar");
        return;
      }

      router.push("/agendar");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <Container width="sm" className={styles.wrap}>
        <Card className={styles.authCard}>
          <p className={styles.eyebrow}>Bem-vindo</p>
          <h1 className={styles.title}>Criar conta</h1>
          <p className={styles.subtitle}>Leva menos de um minuto — depois é só escolher o serviço e o horário.</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <TextField
              label="Nome completo"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <TextField
              label="E-mail"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <TextField
              label="Telefone (opcional)"
              type="tel"
              placeholder="(98) 99999-0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <div>
              <TextField
                label="Senha"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
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
              <p className={passwordValid ? styles.passwordHintOk : styles.passwordHint}>
                {passwordHelperText(form.password)}
              </p>
            </div>

            {error && (
              <p className={styles.formError} role="alert">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} loadingText="Criando..." className={styles.submitButton}>
              Criar conta
            </Button>
          </form>

          <p className={styles.switchLine}>
            Já tem conta? <Link href="/login">Entrar</Link>
          </p>
        </Card>
      </Container>
    </>
  );
}
