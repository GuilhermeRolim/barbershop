"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button, Container, TextField } from "@/components/ui";
import styles from "../login/login.module.css"; // mesmo layout de formulário de auth

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <Container width="sm">
        <h1 className={styles.title}>Criar conta</h1>
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
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <TextField
            label="Senha (mín. 8 caracteres)"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />

          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} loadingText="Criando...">
            Criar conta
          </Button>
        </form>
      </Container>
    </>
  );
}
