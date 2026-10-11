import { useEffect, useState } from 'react';

/** Reloj de pantalla (ms) que se actualiza cada `intervalMs` mientras `active`; solo sirve para MOSTRAR la cuenta regresiva. */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);
  return now;
}
