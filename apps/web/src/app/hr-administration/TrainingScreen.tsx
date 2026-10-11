import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { AppHeader } from '../shared/AppHeader';
import { useWorkContextForHr } from './useWorkContextForHr';
import styles from './HrFlow.module.css';

/**
 * ADP-10 - Capacitacion interna. El contrato hr-administration.yaml NO tiene operaciones para
 * registrar talleres (BR-ADP-008), asi que la pantalla es un aviso claro de "Disponible
 * proximamente": no se inventan endpoints ni se guarda nada en el navegador.
 */
export function TrainingScreen() {
  const { context } = useWorkContextForHr();
  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Personal" />
      <div className={styles.content}>
        <Link className={styles.backLink} to="/personal" state={context ?? undefined}>
          ← Volver a Personal
        </Link>
        <h1 className={styles.title}>Capacitación interna</h1>
        <section className={styles.comingSoon} aria-labelledby="capacitacion-aviso">
          <GraduationCap size={36} aria-hidden="true" />
          <h2 id="capacitacion-aviso" className={styles.sectionTitle}>
            Disponible próximamente
          </h2>
          <p>
            Pronto podrás registrar aquí los talleres internos (tema, fecha, asistentes y una nota sobre la comprensión). Por ahora, estos talleres se siguen registrando fuera del
            sistema.
          </p>
        </section>
      </div>
    </main>
  );
}
