import { z } from "zod";

// Reglas de complejidad de contraseña — reflejan ../backend/src/schemas/auth.ts
// (min 8, ≥1 mayúscula, ≥1 número, ≥1 signo). Reutilizadas por el alta de admin
// (obligatoria) y por el cambio de contraseña propio (opcional).
export const passwordComplexity = z
  .string()
  .trim()
  .min(8, "Al menos 8 caracteres")
  .regex(/[A-Z]/, "Al menos una mayúscula")
  .regex(/[0-9]/, "Al menos un número")
  .regex(/[!@#$%^&*(),.?":{}|<>_\-+=]/, "Al menos un signo");

// POST /api/admin/users — alta de administrador. El caller escribe la contraseña
// temporal (el backend no la genera). `role` refleja el enum real owner|admin.
export const createUserSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto"),
  email: z.email("Ingresa un correo electrónico válido"),
  tempPassword: passwordComplexity,
  role: z.enum(["owner", "admin"]),
});

export type CreateUserData = z.infer<typeof createUserSchema>;

// PUT /api/admin/account — cambio de correo/contraseña propios. El backend exige
// `currentPassword` SIEMPRE. `email` va sembrado con el correo actual; el backend
// solo lo cambia si difiere. `newPassword` es opcional: si va vacío se ignora,
// si va lleno debe cumplir la complejidad y coincidir con `confirmPassword`.
export const updateAccountSchema = z
  .object({
    email: z.email("Ingresa un correo electrónico válido"),
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: passwordComplexity.or(z.literal("")).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((d) => !d.newPassword || d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type UpdateAccountData = z.infer<typeof updateAccountSchema>;
