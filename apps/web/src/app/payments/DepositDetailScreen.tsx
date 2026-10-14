import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { getFirebaseAuth } from '../providers/firebase';
import { useWorkContextForPayments } from './useWorkContextForPayments';
import { usePaymentPermissions } from './payment-permissions';
import {
  ADJUSTMENT_TYPE_LABELS,
  formatCurrency,
  isTerminalStatus,
  type AdjustmentType,
} from './payment-domain';
import {
  getDeposit,
  registerAdjustment,
  approveRefund,
  closeFinancial,
  PaymentCommandError,
  type DepositDetail,
} from './payments-client';
import { DepositStatusBadge } from './DepositBadges';
import { RegisterAdjustmentDialog } from './RegisterAdjustmentDialog';
import styles from './DepositDetailScreen.module.css';
import { formatLimaDate, formatLimaDateTime } from '../shared/lima-time';

/**
 * PAG-02 — Detalle de Garantía de Alquiler.
 * Fuente: BDD-PAG-001, SDD-PAG-001, payments.yaml v0.1.0, UX/UI §PAG-02.
 * Baseline visual: PROTO-PAG-02-DETALLE-GARANTIA-DESKTOP (APPROVED 2026-10-11).
 * Layout: 2/3 izquierda (datos + ajustes) + 1/3 derecha (info alquiler + acciones).
 */

type DetailState = 'LOADING' | 'READY' | 'NOT_FOUND' | 'RECOVERABLE_ERROR' | 'SAVING';

function formatDateTime(iso: string): string {
  return formatLimaDateTime(iso);
}

function formatDate(iso: string): string {
  return formatLimaDate(iso);
}

function describeCommandError(err: unknown, fallback: string): string {
  if (err instanceof PaymentCommandError) {
    return err.problem?.detail ?? fallback;
  }
  return fallback;
}

export function DepositDetailScreen() {
  const { depositId } = useParams<{ depositId: string }>();
  const { context, loading: contextLoading } = useWorkContextForPayments();
  const navigate = useNavigate();
  const { can } = usePaymentPermissions();

  const [state, setState] = useState<DetailState>('LOADING');
  const [deposit, setDeposit] = useState<DepositDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!context || !depositId) return;
    setState('LOADING');
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const result = await getDeposit(idToken, depositId, context.companyId, context.branchId);
      setDeposit(result);
      setState('READY');
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        setState('NOT_FOUND');
      } else {
        setState('RECOVERABLE_ERROR');
      }
    }
  }, [context, depositId]);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, load]);

  // --- Acciones ---

  async function handleRegisterAdjustment(data: {
    type: AdjustmentType;
    amount: number;
    reason: string;
  }) {
    if (!context || !depositId || state === 'SAVING') return;
    setState('SAVING');
    setAdjustError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      await registerAdjustment(idToken, depositId, context.companyId, context.branchId, data);
      setNotice('Ajuste registrado correctamente.');
      setAdjusting(false);
      void load();
    } catch (err) {
      setAdjustError(
        describeCommandError(err, 'No pudimos registrar el ajuste. Intenta de nuevo.'),
      );
      setState('READY');
    }
  }

  async function handleApproveRefund() {
    if (!context || !depositId || state === 'SAVING') return;
    setState('SAVING');
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const updated = await approveRefund(idToken, depositId, context.companyId, context.branchId);
      setDeposit(updated);
      setNotice('Devolución aprobada. La garantía pasó a estado Devuelta.');
      setState('READY');
    } catch (err) {
      setError(describeCommandError(err, 'No pudimos aprobar la devolución. Intenta de nuevo.'));
      setState('READY');
    }
  }

  async function handleCloseFinancial() {
    if (!context || !depositId || !deposit || state === 'SAVING') return;
    // retainedAmount = monto ajustado total (la suma de los ajustes DISCOUNT/FULL_RETENTION)
    const retainedAmount = deposit.adjustedAmount ?? 0;
    const notes = 'Cierre de expediente financiero';
    setState('SAVING');
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const updated = await closeFinancial(
        idToken,
        depositId,
        context.companyId,
        context.branchId,
        retainedAmount,
        notes,
      );
      setDeposit(updated);
      setNotice('Expediente financiero cerrado correctamente.');
      setState('READY');
    } catch (err) {
      setError(describeCommandError(err, 'No pudimos cerrar el expediente. Intenta de nuevo.'));
      setState('READY');
    }
  }

  const saving = state === 'SAVING';
  const isTerminal = deposit ? isTerminalStatus(deposit.currentStatus) : false;
  const hasFullRetention = deposit
    ? deposit.adjustments.some((a) => a.type === 'FULL_RETENTION')
    : false;

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Detalle de Garantía" />

      <div className={styles.content} aria-busy={saving}>
        <button type="button" className={styles.backLink} onClick={() => navigate('/pagos/garantias', { state: context ?? undefined })}>
          ← Volver a Pagos y Garantías
        </button>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando garantía…</p>}

        {state === 'NOT_FOUND' && (
          <p className={styles.statusText} role="alert">
            No encontramos esta garantía en tu empresa y sede.
          </p>
        )}

        {(state === 'RECOVERABLE_ERROR' && !deposit) && (
          <p className={styles.statusText} role="alert">
            No pudimos cargar la garantía. Intenta de nuevo en unos segundos.
          </p>
        )}

        {deposit && (
          <>
            <div aria-live="polite">
              {notice && (
                <p className={styles.notice} role="status">
                  {notice}
                </p>
              )}
            </div>
            {error && (
              <p className={styles.errorBanner} role="alert">
                {error}
              </p>
            )}

            <div className={styles.layout}>
              {/* Columna izquierda (2/3): datos + historial de ajustes */}
              <div className={styles.mainColumn}>

                {/* Cabecera de la garantía */}
                <section aria-labelledby="dep-header-title" className={styles.card}>
                  <div className={styles.cardHeaderRow}>
                    <div>
                      <div className={styles.depositTitle}>
                        <h2 id="dep-header-title" className={styles.depositHeading}>
                          Garantía — {deposit.rentalCode}
                        </h2>
                        <DepositStatusBadge status={deposit.currentStatus} />
                      </div>
                      <p className={styles.depositSubtitle}>
                        {deposit.clientName}
                        {deposit.vehiclePlate ? ` · ${deposit.vehiclePlate}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Montos */}
                  <div className={styles.amountsGrid}>
                    <div className={styles.amountBox}>
                      <p className={styles.amountLabel}>Monto original</p>
                      <p className={styles.amountValue}>{formatCurrency(deposit.originalAmount)}</p>
                    </div>
                    <div className={styles.amountBox}>
                      <p className={styles.amountLabel}>Total ajustado</p>
                      <p className={`${styles.amountValue} ${deposit.adjustedAmount ? styles.amountWarning : ''}`}>
                        {deposit.adjustedAmount
                          ? `− ${formatCurrency(deposit.adjustedAmount)}`
                          : '—'}
                      </p>
                    </div>
                    <div className={styles.amountBox}>
                      <p className={styles.amountLabel}>Saldo neto</p>
                      <p className={styles.amountValue}>
                        {formatCurrency(deposit.netAmount ?? deposit.originalAmount)}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Historial de ajustes (append-only) */}
                <section aria-labelledby="dep-adj-title" className={styles.card}>
                  <div className={styles.adjHeader}>
                    <h2 id="dep-adj-title" className={styles.sectionTitle}>
                      Historial de ajustes
                    </h2>
                    {can('REGISTER_ADJUSTMENT') && !isTerminal && (
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => {
                          setAdjustError(null);
                          setAdjusting(true);
                        }}
                        disabled={saving}
                      >
                        + Registrar ajuste
                      </button>
                    )}
                  </div>

                  {deposit.adjustments.length === 0 ? (
                    <p className={styles.emptyAdj}>Sin ajustes registrados.</p>
                  ) : (
                    <ol className={styles.adjList} aria-label="Historial de ajustes">
                      {deposit.adjustments.map((adj) => (
                        <li key={adj.id} className={styles.adjItem}>
                          <div className={`${styles.adjIcon} ${styles[`adjIcon_${adj.type}`]}`} aria-hidden="true">
                            {adj.type === 'RELEASE' ? '+' : '−'}
                          </div>
                          <div className={styles.adjBody}>
                            <div className={styles.adjRow}>
                              <p className={styles.adjTypeName}>{ADJUSTMENT_TYPE_LABELS[adj.type]}</p>
                              <p className={`${styles.adjAmount} ${adj.type === 'RELEASE' ? styles.adjAmountPositive : styles.adjAmountNegative}`}>
                                {adj.type === 'RELEASE' ? '+' : '−'} {formatCurrency(adj.amount)}
                              </p>
                            </div>
                            <p className={styles.adjReason}>{adj.reason}</p>
                            <div className={styles.adjMeta}>
                              <time dateTime={adj.createdAt}>{formatDateTime(adj.createdAt)}</time>
                              <span className={`${styles.adjTypeBadge} ${styles[`adjTypeBadge_${adj.type}`]}`}>
                                {adj.type}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                  <p className={styles.immutabilityNote}>
                    Los ajustes son definitivos y no pueden modificarse (BR-PAG-003)
                  </p>
                </section>

              </div>

              {/* Columna derecha (1/3): info alquiler + acciones */}
              <aside className={styles.sideColumn}>

                {/* Información del alquiler */}
                <section aria-labelledby="dep-rental-info" className={styles.card}>
                  <h2 id="dep-rental-info" className={styles.sectionTitle}>
                    Información del alquiler
                  </h2>
                  <dl className={styles.infoList}>
                    <div className={styles.infoRow}>
                      <dt>Código</dt>
                      <dd className={styles.infoCode}>{deposit.rentalCode}</dd>
                    </div>
                    <div className={styles.infoRow}>
                      <dt>Cliente</dt>
                      <dd>{deposit.clientName}</dd>
                    </div>
                    {deposit.vehiclePlate && (
                      <div className={styles.infoRow}>
                        <dt>Vehículo</dt>
                        <dd>{deposit.vehiclePlate}</dd>
                      </div>
                    )}
                    <div className={styles.infoRow}>
                      <dt>Registrada</dt>
                      <dd>{formatDate(deposit.createdAt)}</dd>
                    </div>
                    {deposit.closedAt && (
                      <div className={styles.infoRow}>
                        <dt>Cerrada</dt>
                        <dd>{formatDate(deposit.closedAt)}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                {/* Acciones disponibles */}
                <section aria-labelledby="dep-actions-title" className={styles.card}>
                  <h2 id="dep-actions-title" className={styles.sectionTitle}>
                    Acciones disponibles
                  </h2>

                  {/* Aprobar devolución */}
                  {can('APPROVE_REFUND') && (
                    <div className={styles.actionItem}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        disabled={saving || isTerminal || hasFullRetention}
                        onClick={() => void handleApproveRefund()}
                        aria-describedby={isTerminal || hasFullRetention ? 'approve-refund-hint' : undefined}
                      >
                        Aprobar devolución de garantía
                      </button>
                      {(isTerminal || hasFullRetention) && (
                        <p id="approve-refund-hint" className={styles.actionHint}>
                          {isTerminal
                            ? 'No disponible — garantía en estado terminal'
                            : 'No disponible — retención total activa'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Cerrar expediente financiero */}
                  {can('CLOSE_FINANCIAL') && (
                    <div className={styles.actionItem}>
                      <button
                        type="button"
                        className={styles.actionButtonSecondary}
                        disabled={saving || isTerminal}
                        onClick={() => void handleCloseFinancial()}
                        aria-describedby={isTerminal ? 'close-financial-hint' : undefined}
                      >
                        Cerrar expediente financiero
                      </button>
                      {isTerminal && (
                        <p id="close-financial-hint" className={styles.actionHint}>
                          No disponible — garantía ya cerrada
                        </p>
                      )}
                    </div>
                  )}

                  {!can('APPROVE_REFUND') && !can('CLOSE_FINANCIAL') && (
                    <p className={styles.actionHint}>Sin acciones disponibles para tu perfil.</p>
                  )}
                </section>

              </aside>
            </div>
          </>
        )}
      </div>

      {adjusting && (
        <RegisterAdjustmentDialog
          busy={saving}
          error={adjustError}
          onConfirm={(data) => void handleRegisterAdjustment(data)}
          onCancel={() => setAdjusting(false)}
        />
      )}
    </main>
  );
}
