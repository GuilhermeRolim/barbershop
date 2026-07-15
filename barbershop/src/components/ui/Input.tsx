import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import styles from "./Input.module.css";

interface FieldWrapperProps {
  label: string;
  error?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/**
 * Associa label + campo + mensagem de erro via `htmlFor`/`aria-describedby`.
 * Centraliza a semântica de acessibilidade em um só lugar, em vez de
 * repetir `<label>...<input style={{...}} /></label>` em cada página.
 */
function FieldWrapper({ label, error, children }: FieldWrapperProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children(id, errorId)}
      {error && (
        <p id={errorId} className={styles.errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, className, ...rest },
  ref
) {
  return (
    <FieldWrapper label={label} error={error}>
      {(id, describedBy) => (
        <input
          id={id}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={[styles.input, error && styles.inputError, className].filter(Boolean).join(" ")}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, className, children, ...rest },
  ref
) {
  return (
    <FieldWrapper label={label} error={error}>
      {(id, describedBy) => (
        <select
          id={id}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={[styles.input, styles.select, error && styles.inputError, className].filter(Boolean).join(" ")}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldWrapper>
  );
});
