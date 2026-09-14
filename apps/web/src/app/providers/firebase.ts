import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

/**
 * Igual que en apps/api: a que proyecto de Firebase apunta el frontend
 * (desarrollo o productivo) se decide solo por las variables de entorno
 * VITE_FIREBASE_* (ver .env.example) - nunca hardcodear estos valores.
 *
 * La inicializacion es perezosa (lazy) a proposito: si las variables no
 * estan configuradas todavia, la pantalla de login debe poder renderizarse
 * igual (para revisar UI/UX) - el error solo aparece si el usuario intenta
 * enviar el formulario sin Firebase configurado.
 */
function readFirebaseConfig(): FirebaseOptions {
  const config: FirebaseOptions = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const missing = Object.entries(config).filter(([, v]) => !v);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno de Firebase: ${missing.map(([k]) => k).join(', ')}. Ver apps/web/.env.example.`,
    );
  }

  return config;
}

let cachedApp: FirebaseApp | null = null;

export function getFirebaseAuth(): Auth {
  if (!cachedApp) {
    cachedApp = initializeApp(readFirebaseConfig());
  }
  return getAuth(cachedApp);
}
