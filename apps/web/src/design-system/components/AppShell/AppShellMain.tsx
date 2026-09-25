import type { ReactNode } from 'react';
import styles from './AppShell.module.css';

interface MainProps {
  children: ReactNode;
  className?: string;
}

export function AppShellMain({ children, className }: MainProps) {
  return (
    <main
      id="main-content"
      className={[styles.main, className].filter(Boolean).join(' ')}
    >
      {children}
    </main>
  );
}
