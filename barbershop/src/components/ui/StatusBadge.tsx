import styles from "./StatusBadge.module.css";

// Espelha o enum AppointmentStatus do schema.prisma. Mantido como union de
// strings (em vez de importar @prisma/client no client bundle) para não
// puxar dependências de servidor para componentes "use client".
export type AppointmentStatusValue = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

const STATUS_META: Record<AppointmentStatusValue, { label: string; tone: "gold" | "success" | "danger" | "muted" }> = {
  SCHEDULED: { label: "Agendado", tone: "gold" },
  CONFIRMED: { label: "Confirmado", tone: "gold" },
  COMPLETED: { label: "Concluído", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
  NO_SHOW: { label: "Faltou", tone: "danger" },
};

export function StatusBadge({ status }: { status: string }) {
  // Fallback defensivo: se a API retornar um valor de status não mapeado
  // (ex.: enum novo adicionado no schema mas não atualizado aqui), o badge
  // ainda renderiza algo legível em vez de quebrar ou mostrar "undefined".
  const meta = STATUS_META[status as AppointmentStatusValue] ?? { label: status, tone: "muted" as const };

  return <span className={`${styles.badge} ${styles[meta.tone]}`}>{meta.label}</span>;
}
