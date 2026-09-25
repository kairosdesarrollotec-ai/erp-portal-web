import type { ReactNode } from 'react';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

export function AppShellRoot({ children, className }: AppShellProps) {
  return (
    <div className={[styles.shell, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
