/**
 * BUS-01 — fila de resultado individual dentro del dropdown de búsqueda global.
 * Icono por tipo de entidad (Lucide), título en negrita, subtítulo atenuado.
 */
import { FileText, Calendar, User, Car, RotateCcw, ChevronRight, type LucideIcon } from 'lucide-react';
import type { SearchResultItem as SearchResultItemType, SearchEntityType } from './search-client';
import styles from './GlobalSearch.module.css';

const ENTITY_ICONS: Record<SearchEntityType, LucideIcon> = {
  RENTAL: FileText,
  RESERVATION: Calendar,
  CUSTOMER: User,
  VEHICLE: Car,
  RETURN: RotateCcw,
};

interface SearchResultItemProps {
  item: SearchResultItemType;
  isActive: boolean;
  onSelect: (item: SearchResultItemType) => void;
  id: string;
}

export function SearchResultItem({ item, isActive, onSelect, id }: SearchResultItemProps) {
  const Icon = ENTITY_ICONS[item.type];

  return (
    <div
      id={id}
      role="option"
      aria-selected={isActive}
      className={`${styles.resultItem} ${isActive ? styles.resultItemActive : ''}`}
      onClick={() => onSelect(item)}
      onMouseDown={(e) => e.preventDefault()} // evitar que el input pierda el foco al hacer clic
    >
      <div className={styles.resultItemIcon}>
        <Icon size={15} />
      </div>
      <div className={styles.resultItemText}>
        <span className={styles.resultItemTitle}>{item.title}</span>
        {item.subtitle && (
          <span className={styles.resultItemSubtitle}>{item.subtitle}</span>
        )}
      </div>
      <ChevronRight size={14} className={styles.resultItemArrow} />
    </div>
  );
}
