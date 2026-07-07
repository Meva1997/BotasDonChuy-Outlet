import { z } from "zod";
import { api } from "@/lib/api/client";
import type { LoginData, ForgotPasswordData } from "@/schemas/auth";

// Forma del usuario admin que devuelve el backend (login y /auth/me).
// Refleja `AuthUser` de ../backend/src/middlewares/requireAuth.ts.
export const AuthUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.enum(["owner", "admin"]),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

// POST /api/auth/login → { token, user }
export const LoginResponseSchema = z.object({
  token: z.string(),
  user: AuthUserSchema,
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// GET /api/auth/me → { user }
export const MeResponseSchema = z.object({
  user: AuthUserSchema,
});

// Query key factory — listo para TanStack Query (mismo patrón que productKeys).
export const authKeys = {
  me: ["auth", "me"] as const,
};

// POST /api/auth/login — 401 credenciales, 400 validación, 429 rate-limit.
export async function login(credentials: LoginData): Promise<LoginResponse> {
  const { data } = await api.post("/auth/login", credentials);
  return LoginResponseSchema.parse(data);
}

// POST /api/auth/forgot-password — el backend siempre responde { ok: true }.
export async function forgotPassword(data: ForgotPasswordData): Promise<void> {
  await api.post("/auth/forgot-password", data);
}

// GET /api/auth/me — valida el token contra el backend; 401 si es inválido/expirado
// (el interceptor de lib/api/client.ts cierra sesión y redirige a /login).
export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get("/auth/me");
  return MeResponseSchema.parse(data).user;
}
