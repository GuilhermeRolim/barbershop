"use client";

import useSWR from "swr";

interface FinanceData {
  receitaTotal: string;
  atendimentosConcluidos: number;
  cancelamentosENoShow: number;
  porBarbeiro: { barberId: string; barberName: string; receita: string; atendimentos: number }[];
  porServico: { serviceId: string; serviceName: string; receita: string; atendimentos: number }[];
}

interface Appointment {
  id: string;
  startsAt: string;
  status: string;
  service: { name: string };
  barber: { name: string };
  client: { name: string };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  // Mês corrente como período padrão do relatório financeiro.
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: finance } = useSWR<FinanceData>(
    `/api/dashboard/financeiro?from=${from}&to=${to}`,
    fetcher
  );
  const { data: appointments } = useSWR<{ appointments: Appointment[] }>(
    "/api/appointments",
    fetcher,
    { refreshInterval: 30_000 }
  );

  const today = new Date().toISOString().slice(0, 10);
  const todaysAppointments = appointments?.appointments.filter((a) => a.startsAt.startsWith(today));

  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 24px" }}>
      <h1>Dashboard</h1>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
        <Card label="Receita do mês" value={`R$ ${finance?.receitaTotal ?? "0"}`} />
        <Card label="Atendimentos concluídos" value={String(finance?.atendimentosConcluidos ?? 0)} />
        <Card label="Cancelamentos / faltas" value={String(finance?.cancelamentosENoShow ?? 0)} />
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>Receita por barbeiro</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
              <th style={{ padding: 8 }}>Barbeiro</th>
              <th style={{ padding: 8 }}>Atendimentos</th>
              <th style={{ padding: 8 }}>Receita</th>
            </tr>
          </thead>
          <tbody>
            {finance?.porBarbeiro.map((b) => (
              <tr key={b.barberId} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{b.barberName}</td>
                <td style={{ padding: 8 }}>{b.atendimentos}</td>
                <td style={{ padding: 8 }}>R$ {b.receita}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Agenda de hoje (todos os barbeiros)</h2>
        {todaysAppointments?.length === 0 && <p>Nenhum agendamento hoje.</p>}
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {todaysAppointments?.map((a) => (
            <li key={a.id} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12 }}>
              {new Date(a.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
              {" — "}
              <strong>{a.service.name}</strong> com {a.barber.name} para {a.client.name} ({a.status})
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20 }}>
      <p style={{ margin: 0, color: "#666", fontSize: 14 }}>{label}</p>
      <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 700 }}>{value}</p>
    </div>
  );
}
