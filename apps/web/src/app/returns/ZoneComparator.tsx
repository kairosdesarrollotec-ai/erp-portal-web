import type { RentalEvidenceResponse } from '../rentals/rentals-client';
import type { ReturnEvidenceResponse } from './returns-client';
import { zoneLabel } from './return-evidence';
import styles from './ReturnForms.module.css';

interface Props {
  zone: string;
  delivery: RentalEvidenceResponse[];
  returned: ReturnEvidenceResponse[];
}

function shortDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
}

/**
 * DEV-05 - comparador lado a lado (desktop 2 columnas, movil apilado:
 * entrega arriba, devolucion abajo, mismo encuadre). Las fotos de entrega
 * se traen del alquiler (ALQ-09), no se vuelven a subir.
 */
export function ZoneComparator({ zone, delivery, returned }: Props) {
  const deliveryPhoto = delivery.find((e) => e.zone === zone && e.type === 'PHOTO');
  const returnPhoto = returned.find((e) => e.zone === zone && e.type === 'PHOTO');
  const label = zoneLabel(zone);

  return (
    <div className={styles.compareGrid}>
      <figure className={styles.compareCard} style={{ margin: 0 }}>
        <figcaption className={styles.compareCaption}>
          Entrega{deliveryPhoto ? ` (${shortDate(deliveryPhoto.uploadedAt)})` : ''}
        </figcaption>
        {deliveryPhoto ? (
          <img className={styles.compareImage} src={deliveryPhoto.objectUrl} alt={`Entrega — zona ${label}`} />
        ) : (
          <div className={styles.compareEmpty}>Sin foto de entrega para esta zona</div>
        )}
      </figure>
      <figure className={styles.compareCard} style={{ margin: 0 }}>
        <figcaption className={styles.compareCaption}>
          Devolución{returnPhoto ? ` (${shortDate(returnPhoto.createdAt)})` : ''}
        </figcaption>
        {returnPhoto ? (
          <img className={styles.compareImage} src={returnPhoto.objectUrl} alt={`Devolución — zona ${label}`} />
        ) : (
          <div className={styles.compareEmpty}>Sin foto de devolución para esta zona</div>
        )}
      </figure>
    </div>
  );
}
