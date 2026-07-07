import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Ingresa un correo electrónico válido"),
  // Login solo valida presencia: la autenticación real la hace el backend
  // (401 → credenciales). Las reglas de complejidad (mayúscula/número/signo)
  // pertenecen al registro/reset, no al login — aquí bloquearían a usuarios
  // con contraseñas válidas que no cumplan el patrón.
  password: z.string().min(1, "La contraseña es requerida"),
});

export type LoginData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Ingresa un correo electrónico válido"),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
