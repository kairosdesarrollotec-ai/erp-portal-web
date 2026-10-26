import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

function isDynamicImportError(error: unknown) {
  return error instanceof TypeError && /dynamically imported module|importing a module script/i.test(error.message);
}

function retryKeyFor(error: unknown) {
  return `kairos:chunk-reload-attempted:${error instanceof Error ? error.message : 'unknown'}`;
}

/**
 * Recovers once when a deployment replaces a lazily loaded Vite bundle while a
 * browser is still running the previous application shell.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const retryKey = retryKeyFor(error);
  const shouldReload = isDynamicImportError(error) && sessionStorage.getItem(retryKey) !== 'true';

  useEffect(() => {
    if (!shouldReload) return;

    sessionStorage.setItem(retryKey, 'true');
    window.location.reload();
  }, [retryKey, shouldReload]);

  if (shouldReload) {
    return <main aria-live="polite">Actualizando la aplicación…</main>;
  }

  const message = isRouteErrorResponse(error)
    ? error.statusText
    : 'No se pudo abrir esta pantalla. Actualiza la página e inténtalo nuevamente.';

  return (
    <main role="alert" style={{ margin: '4rem auto', maxWidth: '40rem', padding: '0 1.5rem' }}>
      <h1>No pudimos cargar la pantalla</h1>
      <p>{message}</p>
      <button type="button" onClick={() => window.location.reload()}>Actualizar aplicación</button>
    </main>
  );
}
