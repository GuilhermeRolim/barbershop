import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Page.module.css";

/** Wrapper de largura máxima consistente — substitui o `maxWidth` inline repetido em toda página. */
export function Container({
  width = "md",
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { width?: "sm" | "md" | "lg" }) {
  return <div className={[styles.container, styles[width], className].filter(Boolean).join(" ")} {...rest} />;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
