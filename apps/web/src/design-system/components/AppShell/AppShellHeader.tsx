import type { ReactNode } from 'react';
import styles from './AppShell.module.css';

interface HeaderProps {
  breadcrumbs?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function AppShellHeader({ breadcrumbs, right, className }: HeaderProps) {
  return (
    <header
      className={[styles.header, className].filter(Boolean).join(' ')}
      role="banner"
    >
      <div className={styles.headerInner}>
        <div className={styles.headerLeft}>
          <a href="/" className={styles.logoMark} aria-label="Kairos Corporation — inicio">
            {/*
             * Logotipo: "Velox" en color primario, "Rent" en acento.
             * Autoridad: prototipo APPROVED alquileres_bandeja_veloxrent/code.html.
             */}
            <span className={styles.logoVelox}>
              Velox<span className={styles.logoRent}>Rent</span>
            </span>
          </a>

          {breadcrumbs && (
            <>
              <div
                className={styles.headerDivider}
                role="separator"
                aria-hidden="true"
              />
              {breadcrumbs}
            </>
          )}
        </div>

        {right && <div className={styles.headerRight}>{right}</div>}
      </div>
    </header>
  );
}
