import { forwardRef, type ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Estado de carregamento — desabilita o botão e troca o rótulo. */
  loading?: boolean;
  loadingText?: string;
}

/**
 * Botão base do design system.
 *
 * - `primary`: dourado sólido — ação principal (confirmar, entrar, agendar).
 * - `secondary`: contorno dourado sobre superfície escura — ação alternativa.
 * - `ghost`: sem borda, usado em toggles/tabs (ex.: filtro "Hoje" / "7 dias").
 * - `danger`: terracota — ações destrutivas (cancelar, faltou).
 *
 * `forwardRef` é necessário para permitir uso com libs de formulário ou
 * para foco programático (ex.: focar o botão após submit com erro).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, loadingText, disabled, className, children, ...rest },
  ref
) {
  const classes = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(" ");

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading ? loadingText ?? "Carregando..." : children}
    </button>
  );
});
