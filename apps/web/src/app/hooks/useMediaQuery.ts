import { useEffect, useState } from 'react';

/**
 * Hallazgo de revision (PR #7, TR-03): antes se renderizaban las variantes
 * desktop y mobile de MfaChallengeModal al mismo tiempo en el DOM,
 * ocultando una con CSS (`display: none`) - eso duplicaba formularios
 * activos, autoFocus, autocomplete y anuncios de lector de pantalla. Este
 * hook decide la variante en JS, para que solo una este montada a la vez.
 *
 * SSR-safe por si algun dia se prerenderiza (hoy la app es 100% CSR): en el
 * primer render sin `window` devuelve `false` y se corrige en el efecto.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
