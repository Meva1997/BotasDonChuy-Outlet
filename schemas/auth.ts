import { z } from "zod";
import { passwordComplexity } from "@/schemas/users";

export const loginSchema = z.object({
  email: z.email("Ingresa un correo electrónico válido"),
  // Login solo valida presencia: la autenticación real la hace el backend
  // (401 → credenciales). Las reglas de complejidad (mayúscula/número/signo)
  // pertenecen al registro/reset, no al login — aquí bloquearían a usuarios
  // con contraseñas válidas que no cumplan el patrón.
  // .trim() para igualar el .trim() de passwordComplexity (alta/reset): sin él,
  // una contraseña guardada ya recortada nunca coincidiría si el usuario deja un
  // espacio al teclear/pegar en el login.
  password: z.string().trim().min(1, "La contraseña es requerida"),
});

export type LoginData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Ingresa un correo electrónico válido"),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

// Código de recuperación: 5 dígitos numéricos (refleja resetCodeSchema del
// backend, ../backend/src/schemas/auth.ts).
export const resetCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{5}$/, "El código debe ser de 5 dígitos");

// POST /api/auth/verify-reset-code — valida el código sin consumirlo.
export const verifyResetCodeSchema = z.object({
  email: z.email("Ingresa un correo electrónico válido"),
  code: resetCodeSchema,
});

export type VerifyResetCodeData = z.infer<typeof verifyResetCodeSchema>;

// POST /api/auth/reset-password — misma complejidad que el resto del sistema
// (passwordComplexity de schemas/users.ts) para no dejar al usuario fuera del
// login tras el reset. Refleja resetPasswordSchema del backend.
export const resetPasswordSchema = z
  .object({
    email: z.email("Ingresa un correo electrónico válido"),
    code: resetCodeSchema,
    newPassword: passwordComplexity,
    // .trim() para igualar el .trim() de passwordComplexity: sin él, un espacio
    // al final en ambos campos haría fallar el refine (trimmed !== raw) aunque
    // el usuario escribiera lo mismo.
    confirmPassword: z.string().trim(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
