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
function readMatches(query: string): boolean {
  return typeof window !== 'undefined' ? window.matchMedia(query).matches : false;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => readMatches(query));

  // Hallazgo de lint (react-hooks/set-state-in-effect, PR#4 Bloque 2):
  // llamar setState de forma sincronica en el cuerpo del efecto provoca un
  // render en cascada evitable. Si `query` cambio desde el ultimo render,
  // se ajusta el estado durante el render (patron oficial de React:
  // https://react.dev/learn/you-might-not-need-an-effect) en vez de
  // esperar al efecto para sincronizarlo.
  const [trackedQuery, setTrackedQuery] = useState(query);
  if (query !== trackedQuery) {
    setTrackedQuery(query);
    setMatches(readMatches(query));
  }

  useEffect(() => {
    const mql = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
