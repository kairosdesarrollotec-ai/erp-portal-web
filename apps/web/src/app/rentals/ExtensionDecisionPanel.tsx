import { useState } from 'react';
import { usePermissions } from '../shared/usePermissions';
import { authorizeExtension, rejectExtension } from './rentals-extensions-client';
import { RentalCommandError } from './rentals-client';
import type { RentalResponse } from './rentals-client';
import { describeRentalError } from './rental-errors';
import { formatLimaDateTime } from '../shared/lima-time';
import styles from './ActiveRentalScreen.module.css';


interface Props {
  rental: RentalResponse;
  context: { companyId: string; branchId: string };
  getIdToken: () => Promise<string>;
  onDone: () => void;
}

/**
 * ALQ-11 - Decision de Gerencia sobre una ampliacion pendiente (BR-ALQ-012). Autorizar exige la referencia de la adenda
 * firmada (requisito 4) y admite el id del pago del periodo (requisito 3); rechazar libera la solicitud y el alquiler
 * vuelve a ACTIVE. Permisos RENTAL.AUTHORIZE_EXTENSION / RENTAL.REJECT_EXTENSION.
 */
export function ExtensionDecisionPanel({ rental, context, getIdToken, onDone }: Props) {
  const { can } = usePermissions();
  const canAuthorize = can('RENTAL', 'AUTHORIZE_EXTENSION');
  const canReject = can('RENTAL', 'REJECT_EXTENSION');
  const [addendumRef, setAddendumRef] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [busy, setBusy] = useState<'AUTHORIZE' | 'REJECT' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (rental.status !== 'EXTENSION_PENDING') return null;
  const extensions = rental.extensions ?? [];
  const pending = extensions.find((e) => e.status === 'PENDING') ?? extensions[0] ?? null;

  if (!canAuthorize && !canReject) {
    return (
      <p className={styles.statusText} role="status" data-testid="extension-awaiting-manager">
        La ampliación está pendiente de la decisión de Gerencia.
      </p>
    );
  }

  const paymentIdTrim = paymentId.trim();
  const paymentIdValid = paymentIdTrim.length > 0;
  const canSubmitAuthorize = canAuthorize && addendumRef.trim().length > 0 && paymentIdValid && busy === null;

  async function run(kind: 'AUTHORIZE' | 'REJECT') {
    setBusy(kind);
    setError(null);
    try {
      const idToken = await getIdToken();
      if (kind === 'AUTHORIZE') {
        await authorizeExtension(
          idToken, rental.id, context.companyId, context.branchId, rental.version,
          paymentIdTrim, addendumRef.trim(),
        );
      } else {
        await rejectExtension(idToken, rental.id, context.companyId, context.branchId, rental.version);
      }
      onDone();
    } catch (err) {
      const fallback =
        kind === 'AUTHORIZE' ? 'No pudimos autorizar la ampliación. Intenta de nuevo.' : 'No pudimos rechazar la ampliación. Intenta de nuevo.';
      setError(err instanceof RentalCommandError ? describeRentalError(err, fallback) : fallback);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="alq11-decision" data-testid="extension-decision">
      <h2 id="alq11-decision" className={styles.cardTitle}>Decidir la ampliación</h2>
      {pending?.requestedEndAt && (
        <p className={styles.statusText}>Nueva devolución solicitada: {formatLimaDateTime(pending.requestedEndAt)}</p>
      )}
      {canAuthorize && (
        <>
          <label className={styles.statusText} style={{ display: 'grid', gap: 4 }}>
            Referencia de la adenda firmada
            <input value={addendumRef} onChange={(e) => setAddendumRef(e.target.value)} maxLength={120} />
          </label>
          <label className={styles.statusText} style={{ display: 'grid', gap: 4 }}>
            Referencia del pago previo del periodo adicional (Nº de operación o comprobante)
            <input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} maxLength={100} />
            {!paymentIdValid && <span role="alert">El pago es previo: registra su referencia para poder autorizar.</span>}
          </label>
        </>
      )}
      {error && <p role="alert" className={styles.statusText}>{error}</p>}
      <div className={styles.actions}>
        {canAuthorize && (
          <button type="button" className={styles.primary} disabled={!canSubmitAuthorize} onClick={() => void run('AUTHORIZE')}>
            {busy === 'AUTHORIZE' ? 'Autorizando…' : 'Autorizar ampliación'}
          </button>
        )}
        {canReject && (
          <button type="button" className={styles.danger} disabled={busy !== null} onClick={() => void run('REJECT')}>
            {busy === 'REJECT' ? 'Rechazando…' : 'Rechazar ampliación'}
          </button>
        )}
      </div>
    </section>
  );
}
