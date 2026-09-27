/**
 * Button — primitiva del Design System Kairos Corporation
 * Fuente: veloxrent_erp_design_system/DESIGN.md — Components > Buttons
 */
import type { ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader } from 'lucide-react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'destructive';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Renderiza el hijo como raiz del boton (util con <Link> de React Router) */
  asChild?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  asChild = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Comp
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {loading && (
        <Loader
          className={styles.spinner}
          aria-hidden="true"
          size={14}
        />
      )}
      {children}
    </Comp>
  );
}
