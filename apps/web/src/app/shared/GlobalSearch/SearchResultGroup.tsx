/**
 * BUS-01 — grupo de resultados con cabecera de tipo de entidad y lista de ítems.
 */
import type { SearchResultGroup as SearchResultGroupType, SearchResultItem as SearchResultItemType } from './search-client';
import { SearchResultItem } from './SearchResultItem';
import styles from './GlobalSearch.module.css';

interface SearchResultGroupProps {
  group: SearchResultGroupType;
  activeIndex: number;
  globalOffset: number;
  onSelect: (item: SearchResultItemType) => void;
  listboxId: string;
}

export function SearchResultGroup({
  group,
  activeIndex,
  globalOffset,
  onSelect,
  listboxId,
}: SearchResultGroupProps) {
  return (
    <div className={styles.resultGroup}>
      <div className={styles.resultGroupHeader}>
        <span className={styles.resultGroupLabel}>{group.label.toUpperCase()}</span>
        <span className={styles.resultGroupCount}>
          {group.results.length} {group.results.length === 1 ? 'coincidencia' : 'coincidencias'}
        </span>
      </div>
      {group.results.map((item, idx) => (
        <SearchResultItem
          key={item.id}
          item={item}
          isActive={activeIndex === globalOffset + idx}
          onSelect={onSelect}
          id={`${listboxId}-item-${globalOffset + idx}`}
        />
      ))}
    </div>
  );
}
