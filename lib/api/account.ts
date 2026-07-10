import { z } from "zod";
import { api } from "@/lib/api/client";

// PUT /api/admin/account → { ok: true } (NO devuelve el usuario actualizado; la
// UI rehidrata el correo vía authStore.setUser + invalidación de authKeys.me).
export const AccountUpdateResponseSchema = z.object({ ok: z.boolean() });

export type AccountUpdateResponse = z.infer<typeof AccountUpdateResponseSchema>;

// `currentPassword` es obligatoria para CUALQUIER cambio. Se manda `email`
// (sembrado con el actual; el backend solo lo cambia si difiere) y opcionalmente
// `newPassword`/`confirmPassword`.
export interface AccountUpdateInput {
  currentPassword: string;
  email?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// PUT /api/admin/account — 401 contraseña actual incorrecta, 409 correo en uso,
// 400 validación. Un 2xx ya persistió → safeParse (patrón de escrituras).
// `skipAuthRedirect`: el 401 aquí significa "contraseña incorrecta", NO "sesión
// expirada" — la UI lo muestra inline, sin cerrar la sesión (ver lib/api/client.ts).
export async function updateOwnAccount(
  input: AccountUpdateInput
): Promise<AccountUpdateResponse> {
  const { data } = await api.put("/admin/account", input, {
    skipAuthRedirect: true,
  });
  const parsed = AccountUpdateResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.warn("updateOwnAccount: respuesta 2xx inesperada del backend", parsed.error);
    return { ok: true };
  }
  return parsed.data;
}
