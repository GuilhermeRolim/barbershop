import type { HTMLAttributes } from "react";
import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Reduz padding/typography — usado em listas densas (agenda, agendamentos). */
  compact?: boolean;
  /** Acento dourado sutil na borda esquerda — usado para destacar item ativo/selecionado. */
  accented?: boolean;
}

export function Card({ compact = false, accented = false, className, ...rest }: CardProps) {
  const classes = [styles.card, compact && styles.compact, accented && styles.accented, className]
    .filter(Boolean)
    .join(" ");
  return <div className={classes} {...rest} />;
}

/** Card de métrica usado no dashboard do proprietário (receita, atendimentos, etc). */
export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className={styles.metricLabel}>{label}</p>
      <p className={styles.metricValue}>{value}</p>
    </Card>
  );
}
