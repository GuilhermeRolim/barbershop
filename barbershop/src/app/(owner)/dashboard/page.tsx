"use client";

import useSWR from "swr";
import { Container, MetricCard, PageHeader, StatusBadge } from "@/components/ui";
import styles from "./dashboard.module.css";

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

  const { data: finance } = useSWR<FinanceData>(`/api/dashboard/financeiro?from=${from}&to=${to}`, fetcher);
  const { data: appointments } = useSWR<{ appointments: Appointment[] }>("/api/appointments", fetcher, {
    refreshInterval: 30_000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const todaysAppointments = appointments?.appointments.filter((a) => a.startsAt.startsWith(today));

  return (
    <Container width="lg">
      <PageHeader title="Dashboard" subtitle="Visão geral do mês corrente." />

      <section className={styles.metricsGrid}>
        <MetricCard label="Receita do mês" value={`R$ ${finance?.receitaTotal ?? "0"}`} />
        <MetricCard label="Atendimentos concluídos" value={String(finance?.atendimentosConcluidos ?? 0)} />
        <MetricCard label="Cancelamentos / faltas" value={String(finance?.cancelamentosENoShow ?? 0)} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Receita por barbeiro</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Barbeiro</th>
                <th>Atendimentos</th>
                <th>Receita</th>
              </tr>
            </thead>
            <tbody>
              {finance?.porBarbeiro.map((b) => (
                <tr key={b.barberId}>
                  <td>{b.barberName}</td>
                  <td>{b.atendimentos}</td>
                  <td>R$ {b.receita}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Agenda de hoje (todos os barbeiros)</h2>
        {todaysAppointments?.length === 0 && <p className={styles.muted}>Nenhum agendamento hoje.</p>}
        <ul className={styles.list}>
          {todaysAppointments?.map((a) => (
            <li key={a.id} className={styles.listItem}>
              <span>
                {new Date(a.startsAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Sao_Paulo",
                })}
                {" — "}
                <strong>{a.service.name}</strong> com {a.barber.name} para {a.client.name}
              </span>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
