import { ChevronRight } from 'lucide-react';
import styles from './AppShell.module.css';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function AppShellBreadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Ruta de navegacion">
      <ol className={[styles.breadcrumbs, className].filter(Boolean).join(' ')}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className={styles.breadcrumbItem}>
              {index > 0 && (
                <span className={styles.breadcrumbSeparator} aria-hidden="true">
                  <ChevronRight size={10} strokeWidth={2.5} />
                </span>
              )}
              {isLast || !item.href ? (
                <span
                  className={styles.breadcrumbCurrent}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <a href={item.href} className={styles.breadcrumbLink}>
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
