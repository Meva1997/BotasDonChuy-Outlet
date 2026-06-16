import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Ingresa un correo electrónico válido"),
  password: z
    .string()
    .trim()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type LoginData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Ingresa un correo electrónico válido"),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
