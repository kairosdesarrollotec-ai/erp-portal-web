import { z } from 'zod';

/**
 * TR-01 - Inicio de sesion. Campos: correo/usuario (obligatorio),
 * contraseña (obligatoria). PANTALLAS-V2-B-TRANSVERSAL.md, punto 6.
 */
export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Ingresa tu correo o usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
