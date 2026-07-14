"use client";

import { useState } from "react";
import useSWR from "swr";

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
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 24px" }}>
      <h1>Minha agenda</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setRange("today")}
          style={{ padding: "8px 16px", background: range === "today" ? "#1a1a1a" : "#fff", color: range === "today" ? "#fff" : "#1a1a1a", border: "1px solid #1a1a1a", borderRadius: 6 }}
        >
          Hoje
        </button>
        <button
          onClick={() => setRange("week")}
          style={{ padding: "8px 16px", background: range === "week" ? "#1a1a1a" : "#fff", color: range === "week" ? "#fff" : "#1a1a1a", border: "1px solid #1a1a1a", borderRadius: 6 }}
        >
          Próximos 7 dias
        </button>
      </div>

      {data?.appointments.length === 0 && <p>Nenhum agendamento neste período.</p>}

      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {data?.appointments.map((a) => (
          <li key={a.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>
                {new Date(a.startsAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </strong>
              <span>{a.status}</span>
            </div>
            <p style={{ margin: "6px 0" }}>
              {a.service.name} ({a.service.durationMin}min) — R$ {a.service.price}
            </p>
            <p style={{ margin: "6px 0" }}>
              Cliente: {a.client.name} {a.client.phone ? `— ${a.client.phone}` : ""}
            </p>

            {(a.status === "SCHEDULED" || a.status === "CONFIRMED") && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {a.status === "SCHEDULED" && (
                  <button onClick={() => updateStatus(a.id, "CONFIRMED")} style={{ padding: "6px 12px" }}>
                    Confirmar
                  </button>
                )}
                <button onClick={() => updateStatus(a.id, "COMPLETED")} style={{ padding: "6px 12px" }}>
                  Concluir
                </button>
                <button onClick={() => updateStatus(a.id, "NO_SHOW")} style={{ padding: "6px 12px" }}>
                  Cliente faltou
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
