import { useEffect } from 'react';
import { sealLegacyLocalData } from './sealed-store';

/**
 * SDD-00 §17.4: al iniciar la sesión autenticada cifra los datos locales que hayan quedado en texto plano de versiones
 * anteriores (cola de asistencia, evidencia, ediciones de checklist) y elimina el plano. Nunca bloquea la pantalla.
 */
export function useLocalDataProtection(): void {
  useEffect(() => {
    void sealLegacyLocalData().catch((error) => {
      console.warn('[offline] No se pudo cifrar datos locales heredados.', error instanceof Error ? error.message : error);
    });
  }, []);
}
