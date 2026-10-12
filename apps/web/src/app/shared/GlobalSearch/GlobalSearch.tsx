/**
 * BUS-01 — componente de búsqueda global del shell.
 * Prototipos aprobados: PROTO-BUS-01-DROPDOWN-DESKTOP, PROTO-BUS-01-DROPDOWN-MOBILE,
 * PROTO-BUS-01-EMPTY-DESKTOP (prototype-manifest.yaml).
 *
 * Integración: insertado en AppHeader.tsx (zona derecha, antes del bell).
 */
import { useRef, useState, useId, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useGlobalSearch } from './useGlobalSearch';
import { SearchResultGroup } from './SearchResultGroup';
import type { SearchResultItem } from './search-client';
import styles from './GlobalSearch.module.css';

const LISTBOX_ID_PREFIX = 'gs-listbox';

export function GlobalSearch() {
  const navigate = useNavigate();
  const uid = useId();
  const listboxId = `${LISTBOX_ID_PREFIX}-${uid}`;
  const inputId = `gs-input-${uid}`;

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { groups, isLoading, showDropdown } = useGlobalSearch(inputValue);

  // Aplanar todos los resultados para navegación con teclado
  const allResults: SearchResultItem[] = groups.flatMap((g) => g.results);
  const totalResults = allResults.length;

  const close = useCallback(() => {
    setOpen(false);
    setInputValue('');
    setActiveIndex(-1);
  }, []);

  const openSearch = useCallback(() => {
    setOpen(true);
    setInputValue('');
    setActiveIndex(-1);
    // Foco al input en el siguiente tick
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      navigate(item.route);
      close();
    },
    [navigate, close],
  );

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open, close]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (totalResults > 0) {
          setActiveIndex((prev) => (prev < totalResults - 1 ? prev + 1 : 0));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (totalResults > 0) {
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalResults - 1));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < totalResults) {
          handleSelect(allResults[activeIndex]);
        }
        break;
      default:
        break;
    }
  }

  const activeDescendantId =
    activeIndex >= 0 ? `${listboxId}-item-${activeIndex}` : undefined;

  // Calcular offsets acumulados por grupo para el id de ítem activo
  const groupOffsets: number[] = [];
  let acc = 0;
  for (const g of groups) {
    groupOffsets.push(acc);
    acc += g.results.length;
  }

  // Determinar si el dropdown debe mostrarse
  const dropdownVisible = open && inputValue.trim().length >= 2;

  return (
    <div ref={containerRef} className={styles.container}>
      {/* Botón lupa (trigger) */}
      {!open && (
        <button
          type="button"
          className={styles.triggerButton}
          onClick={openSearch}
          aria-label="Abrir búsqueda global"
        >
          <Search size={18} />
        </button>
      )}

      {/* Input de búsqueda (visible cuando open) */}
      {open && (
        <div className={styles.inputWrapper}>
          <div
            className={styles.inputContainer}
          >
            <Search size={15} className={styles.inputIcon} aria-hidden="true" />
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              role="combobox"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar por nombre, documento, placa o expediente..."
              className={styles.input}
              autoComplete="off"
              aria-label="Búsqueda global"
              aria-autocomplete="list"
              aria-expanded={dropdownVisible}
              aria-haspopup="listbox"
              aria-activedescendant={activeDescendantId}
              aria-controls={listboxId}
            />
            <div className={styles.inputRight}>
              <kbd className={styles.escHint} aria-hidden="true">ESC</kbd>
              {inputValue && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => { setInputValue(''); setActiveIndex(-1); inputRef.current?.focus(); }}
                  aria-label="Limpiar búsqueda"
                  tabIndex={-1}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Dropdown de resultados */}
          {dropdownVisible && (
            <div className={styles.dropdown}>
              {isLoading ? (
                <div className={styles.loadingState} aria-live="polite" aria-busy="true">
                  <span className={styles.spinner} aria-hidden="true" />
                  <span className={styles.loadingText}>Buscando…</span>
                </div>
              ) : groups.length === 0 && showDropdown ? (
                /* Estado vacío — PROTO-BUS-01-EMPTY-DESKTOP */
                <div className={styles.emptyState} role="status">
                  <div className={styles.emptyIcon} aria-hidden="true">
                    <Search size={18} />
                  </div>
                  <p className={styles.emptyText}>
                    No encontramos resultados para{' '}
                    <strong>'{inputValue.trim()}'</strong>
                  </p>
                </div>
              ) : (
                <>
                  <div
                    id={listboxId}
                    role="listbox"
                    aria-label="Resultados de búsqueda"
                    className={styles.resultsList}
                  >
                    {groups.map((group, gi) => (
                      <SearchResultGroup
                        key={group.type}
                        group={group}
                        activeIndex={activeIndex}
                        globalOffset={groupOffsets[gi]}
                        onSelect={handleSelect}
                        listboxId={listboxId}
                      />
                    ))}
                  </div>
                  {/* Footer con hints de teclado — PROTO-BUS-01-DROPDOWN-DESKTOP */}
                  <div className={styles.dropdownFooter} aria-hidden="true">
                    <div className={styles.keyHints}>
                      <span>
                        Navegar con{' '}
                        <kbd className={styles.key}>↑</kbd>{' '}
                        <kbd className={styles.key}>↓</kbd>
                      </span>
                      <span>
                        Abrir con <kbd className={styles.key}>ENTER</kbd>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
