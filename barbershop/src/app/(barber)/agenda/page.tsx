"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button, Card, Container, PageHeader, StatusBadge } from "@/components/ui";
import styles from "./agenda.module.css";

interface Appointment {
  id: string;
  startsAt: string;
  status: string;
  notes: string | null;
  service: { name: string; durationMin: number; price: string };
  client: { name: string; phone: string | null };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function startOfDayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export default function AgendaBarbeiroPage() {
  const [range, setRange] = useState<"today" | "week">("today");

  const from = startOfDayISO(0);
  const to = range === "today" ? endOfDayISO(0) : endOfDayISO(6);

  const { data, mutate } = useSWR<{ appointments: Appointment[] }>(
    `/api/appointments?from=${from}&to=${to}`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error ?? "Erro ao atualizar");
      return;
    }
    mutate();
  }

  return (
    <Container>
      <PageHeader title="Minha agenda" />

      <div className={styles.rangeToggle} role="tablist" aria-label="Período">
        <Button variant="ghost" aria-pressed={range === "today"} onClick={() => setRange("today")}>
          Hoje
        </Button>
        <Button variant="ghost" aria-pressed={range === "week"} onClick={() => setRange("week")}>
          Próximos 7 dias
        </Button>
      </div>

      {data?.appointments.length === 0 && <p className={styles.muted}>Nenhum agendamento neste período.</p>}

      <ul className={styles.list}>
        {data?.appointments.map((a) => (
          <li key={a.id}>
            <Card compact>
              <div className={styles.cardTop}>
                <strong>
                  {new Date(a.startsAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
                <StatusBadge status={a.status} />
              </div>
              <p className={styles.line}>
                {a.service.name} ({a.service.durationMin}min) — R$ {a.service.price}
              </p>
              <p className={styles.line}>
                Cliente: {a.client.name} {a.client.phone ? `— ${a.client.phone}` : ""}
              </p>

              {(a.status === "SCHEDULED" || a.status === "CONFIRMED") && (
                <div className={styles.actions}>
                  {a.status === "SCHEDULED" && (
                    <Button size="sm" variant="secondary" onClick={() => updateStatus(a.id, "CONFIRMED")}>
                      Confirmar
                    </Button>
                  )}
                  <Button size="sm" variant="primary" onClick={() => updateStatus(a.id, "COMPLETED")}>
                    Concluir
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => updateStatus(a.id, "NO_SHOW")}>
                    Cliente faltou
                  </Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </Container>
  );
}
