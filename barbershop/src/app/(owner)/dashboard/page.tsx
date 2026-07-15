"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button, Container, MetricCard, PageHeader, StatusBadge } from "@/components/ui";
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

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export default function DashboardPage() {
  // monthOffset 0 = mês corrente, -1 = mês anterior, etc. Permite navegar
  // sem precisar de um seletor de data completo.
  const [monthOffset, setMonthOffset] = useState(0);

  const { from, to, label } = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const rangeFrom = new Date(base.getFullYear(), base.getMonth(), 1);
    const rangeTo = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
    return {
      from: rangeFrom.toISOString(),
      to: rangeTo.toISOString(),
      label: MONTH_LABEL_FORMATTER.format(base),
    };
  }, [monthOffset]);

  const { data: finance, isLoading: financeLoading } = useSWR<FinanceData>(
    `/api/dashboard/financeiro?from=${from}&to=${to}`,
    fetcher
  );
  const { data: appointments } = useSWR<{ appointments: Appointment[] }>("/api/appointments", fetcher, {
    refreshInterval: 30_000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const todaysAppointments = appointments?.appointments.filter((a) => a.startsAt.startsWith(today));
  const isCurrentMonth = monthOffset === 0;

  return (
    <Container width="lg">
      <PageHeader
        title="Dashboard"
        subtitle={`Visão geral de ${label}.`}
        action={
          <div className={styles.monthNav}>
            <Button variant="ghost" size="sm" onClick={() => setMonthOffset((m) => m - 1)}>
              ← Mês anterior
            </Button>
            {!isCurrentMonth && (
              <Button variant="ghost" size="sm" onClick={() => setMonthOffset(0)}>
                Mês atual
              </Button>
            )}
            <Button variant="ghost" size="sm" disabled={isCurrentMonth} onClick={() => setMonthOffset((m) => m + 1)}>
              Próximo mês →
            </Button>
          </div>
        }
      />

      <section className={styles.metricsGrid}>
        <MetricCard label="Receita do período" value={financeLoading ? "..." : `R$ ${finance?.receitaTotal ?? "0"}`} />
        <MetricCard
          label="Atendimentos concluídos"
          value={financeLoading ? "..." : String(finance?.atendimentosConcluidos ?? 0)}
        />
        <MetricCard
          label="Cancelamentos / faltas"
          value={financeLoading ? "..." : String(finance?.cancelamentosENoShow ?? 0)}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Receita por barbeiro</h2>
        {!financeLoading && finance?.porBarbeiro.length === 0 && (
          <p className={styles.muted}>Nenhum atendimento concluído neste período.</p>
        )}
        {(financeLoading || (finance?.porBarbeiro.length ?? 0) > 0) && (
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
                {financeLoading && (
                  <tr>
                    <td colSpan={3} className={styles.muted}>
                      Carregando...
                    </td>
                  </tr>
                )}
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
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Receita por serviço</h2>
        {!financeLoading && finance?.porServico.length === 0 && (
          <p className={styles.muted}>Nenhum atendimento concluído neste período.</p>
        )}
        {(financeLoading || (finance?.porServico.length ?? 0) > 0) && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Atendimentos</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                {financeLoading && (
                  <tr>
                    <td colSpan={3} className={styles.muted}>
                      Carregando...
                    </td>
                  </tr>
                )}
                {finance?.porServico
                  // Maior receita primeiro — destaca os serviços mais lucrativos do período.
                  .slice()
                  .sort((a, b) => Number(b.receita) - Number(a.receita))
                  .map((s) => (
                    <tr key={s.serviceId}>
                      <td>{s.serviceName}</td>
                      <td>{s.atendimentos}</td>
                      <td>R$ {s.receita}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Agenda de hoje (todos os barbeiros)</h2>
        {!appointments && <p className={styles.muted}>Carregando...</p>}
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
