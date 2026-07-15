"use client";

import { useState } from "react";
import useSWR from "swr";
import { Container, PageHeader } from "@/components/ui";
import roleBadgeStyles from "@/components/ui/StatusBadge.module.css";
import styles from "./usuarios.module.css";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "BARBER" | "CLIENT";
  active: boolean;
  createdAt: string;
}

const ROLE_LABEL: Record<UserRow["role"], string> = {
  OWNER: "Proprietário",
  BARBER: "Barbeiro",
  CLIENT: "Cliente",
};

// Reaproveita as mesmas classes de "tom" do StatusBadge de agendamentos
// (gold/success/muted) em vez de criar um componente de badge paralelo
// só pra papel de usuário — a paleta de cores já existe, só o rótulo muda.
const ROLE_TONE: Record<UserRow["role"], string | undefined> = {
  OWNER: roleBadgeStyles.gold,
  BARBER: roleBadgeStyles.success,
  CLIENT: roleBadgeStyles.muted,
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function UsuariosPage() {
  const { data, mutate, isLoading } = useSWR<{ users: UserRow[] }>("/api/users", fetcher);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(userId: string, role: UserRow["role"]) {
    setPendingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Erro ao atualizar papel");
        return;
      }
      mutate();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Container width="lg">
      <PageHeader
        title="Usuários"
        subtitle="Promova clientes a barbeiro, ou ajuste o papel de qualquer conta."
      />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {isLoading && <p className={styles.muted}>Carregando...</p>}

      {!isLoading && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel atual</th>
                <th>Alterar para</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`${roleBadgeStyles.badge} ${ROLE_TONE[u.role] ?? ""}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td>
                    <select
                      aria-label={`Alterar papel de ${u.name}`}
                      className={styles.roleSelect}
                      value={u.role}
                      disabled={pendingId === u.id}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value as UserRow["role"])
                      }
                    >
                      <option value="CLIENT">Cliente</option>
                      <option value="BARBER">Barbeiro</option>
                      <option value="OWNER">Proprietário</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
