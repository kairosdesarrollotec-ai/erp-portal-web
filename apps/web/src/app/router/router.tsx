import { createBrowserRouter } from 'react-router-dom';
import { LoginScreen } from '../auth/LoginScreen';
import { ActivationScreen } from '../auth/ActivationScreen';
import { WorkContextScreen } from '../auth/WorkContextScreen';
import { RequireAuth } from '../auth/RequireAuth';
import { HealthCheckScreen } from './HealthCheckScreen';

// Pantallas reales se registran aqui una a una, pantalla a pantalla,
// cada una respaldada por su UX-ID + PROTO-ID aprobado
// (ver .claude/skills/frontend-screen/SKILL.md).
export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginScreen />,
  },
  {
    path: '/activar-cuenta',
    // TR-02 - HU-21. Login exitoso navega aqui si el usuario esta en
    // "primer acceso" (ver useLogin.ts).
    element: <ActivationScreen />,
  },
  {
    path: '/seleccion-empresa-sede',
    // TR-05 - HU-23. useLogin.ts navega aqui si el usuario tiene 0, o mas
    // de 1, asignacion empresa/sede (BR-ORG-002). RequireAuth (hallazgo de
    // revision): sin sesion autenticada, ni siquiera se monta la pantalla.
    element: (
      <RequireAuth>
        <WorkContextScreen />
      </RequireAuth>
    ),
  },
  {
    path: '/tablero',
    // TR-06 - placeholder hasta HU-24. Login exitoso navega aqui por ahora.
    // RequireAuth (hallazgo de revision): antes no tenia ninguna
    // verificacion, se podia entrar por URL directa sin sesion.
    element: (
      <RequireAuth>
        <HealthCheckScreen />
      </RequireAuth>
    ),
  },
  {
    path: '/health',
    element: <HealthCheckScreen />,
  },
]);
