import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listInterviewers, type Interviewer, type RecruitmentScope } from './recruitment-client';
import styles from './RecruitmentFlow.module.css';

type LoadState = 'LOADING' | 'READY' | 'ERROR';

interface Props {
  inputId: string;
  label: string;
  scope: RecruitmentScope | null;
  /** uid del usuario actual: se preselecciona si aparece en la lista inicial. */
  currentUserId: string;
  disabled?: boolean;
  /** `id` del entrevistador elegido (valor de `interviewerId`) o '' si no hay selección. */
  onChange: (interviewerId: string) => void;
}

/** Combobox accesible (patrón ARIA list autocomplete) sobre GET /interviewers. */
export function InterviewerPicker({ inputId, label, scope, currentUserId, disabled, onChange }: Props) {
  const listId = useId();
  const [text, setText] = useState('');
  const [items, setItems] = useState<Interviewer[]>([]);
  const [state, setState] = useState<LoadState>('LOADING');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState<Interviewer | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const preselected = useRef(false);
  const companyId = scope?.companyId;
  const branchId = scope?.branchId;

  // Búsqueda: la primera carga (q vacío) es inmediata; al escribir se espera 250 ms.
  useEffect(() => {
    if (!companyId || !branchId) return;
    if (selected && text === selected.fullName) return;
    const controller = new AbortController();
    const q = text.trim();
    const timer = setTimeout(
      async () => {
        setState('LOADING');
        try {
          const user = getFirebaseAuth().currentUser;
          if (!user) throw new Error('no-user');
          const token = await user.getIdToken();
          const list = await listInterviewers(token, { companyId, branchId }, q || undefined, controller.signal);
          if (controller.signal.aborted) return;
          setItems(list);
          setActive(-1);
          setState('READY');
          if (!preselected.current && q === '') {
            preselected.current = true;
            const me = list.find((i) => i.id === currentUserId);
            if (me) {
              setSelected(me);
              setText(me.fullName);
              onChange(me.id);
            }
          }
        } catch {
          if (!controller.signal.aborted) setState('ERROR');
        }
      },
      q === '' ? 0 : 250,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `selected`/`onChange` se omiten a propósito: solo disparan búsqueda el texto, el contexto y el reintento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, companyId, branchId, reloadKey, currentUserId]);

  const choose = useCallback(
    (item: Interviewer) => {
      setSelected(item);
      setText(item.fullName);
      setOpen(false);
      onChange(item.id);
    },
    [onChange],
  );

  function onInput(value: string) {
    setText(value);
    setOpen(true);
    if (selected) {
      setSelected(null);
      onChange('');
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (items.length === 0 ? -1 : Math.min(i + 1, items.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (items.length === 0 ? -1 : Math.max(i - 1, 0)));
    } else if (event.key === 'Enter' && open && active >= 0 && items[active]) {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const showList = open && state === 'READY' && items.length > 0;
  const statusText =
    state === 'LOADING'
      ? 'Buscando entrevistadores…'
      : state === 'ERROR'
        ? ''
        : items.length === 0
          ? text.trim()
            ? 'No hay entrevistadores que coincidan con la búsqueda.'
            : 'No hay entrevistadores disponibles en esta sede.'
          : selected
            ? ''
            : `${items.length} resultado${items.length === 1 ? '' : 's'}. Elige uno de la lista.`;

  return (
    <div className={styles.comboWrap}>
      <label className={styles.fieldLabel} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        className={styles.input}
        value={text}
        onChange={(e) => onInput(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        disabled={disabled}
        placeholder="Busca por nombre"
        aria-required="true"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
      />
      <ul id={listId} role="listbox" aria-label={label} className={styles.listbox} hidden={!showList}>
        {items.map((item, index) => (
          <li
            key={item.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={selected?.id === item.id}
            className={`${styles.option} ${index === active ? styles.optionActive : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(item);
            }}
          >
            {item.fullName}
          </li>
        ))}
      </ul>
      {state === 'ERROR' ? (
        <p className={styles.hint} role="alert">
          No pudimos cargar los entrevistadores.{' '}
          <button type="button" className={styles.secondaryButton} onClick={() => setReloadKey((k) => k + 1)}>
            Reintentar
          </button>
        </p>
      ) : (
        <p className={styles.hint} aria-live="polite">
          {statusText}
        </p>
      )}
    </div>
  );
}
