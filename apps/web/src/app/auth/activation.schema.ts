import { z } from 'zod';

/**
 * TR-02 paso 1 - Activa tu cuenta. Fuente: PANTALLAS-V2-B-TRANSVERSAL.md,
 * prototipo PROTO-TR-02-ACTIVACION-PASO-1 (checklist en vivo: minimo 8
 * caracteres, al menos una mayuscula, al menos un numero).
 *
 * NOTA: el script del prototipo calcula "allValid" incluyendo la
 * coincidencia entre ambos campos, pero el boton "Continuar" solo se
 * habilita/deshabilita segun los 3 requisitos de la contraseña (no valida
 * coincidencia) - inconsistencia propia del script del prototipo, no de la
 * composicion visual. Se corrige aqui: el formulario tambien exige que
 * ambos campos coincidan antes de avanzar.
 */
export const activationPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Debe tener minimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe tener al menos una letra mayuscula')
      .regex(/[0-9]/, 'Debe tener al menos un numero'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type ActivationPasswordFormValues = z.infer<typeof activationPasswordSchema>;

export function evaluatePasswordRequirements(value: string) {
  return {
    hasLength: value.length >= 8,
    hasUpper: /[A-Z]/.test(value),
    hasNumber: /[0-9]/.test(value),
  };
}
