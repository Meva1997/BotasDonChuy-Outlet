import { z } from "zod";
import { api } from "@/lib/api/client";

// Forma del usuario admin del panel (GET /api/admin/users). El backend nunca
// devuelve `passwordHash`. `role` refleja el enum real owner|admin.
// Ver ../backend/src/controllers/adminUser.controller.ts.
export const AdminUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email(),
  role: z.enum(["owner", "admin"]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;

// El endpoint devuelve un array plano ordenado por id ASC.
export const AdminUserListSchema = z.array(AdminUserSchema);

// DELETE /api/admin/users/:id → { ok: true }.
export const DeleteResponseSchema = z.object({ ok: z.boolean() });

export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;

// Payload de alta. `tempPassword` la escribe el owner (el backend no la genera);
// las reglas de complejidad se validan en el cliente vía schemas/users.ts.
export interface CreateUserInput {
  name: string;
  email: string;
  tempPassword: string;
  role?: "owner" | "admin";
}

// Query key factory (mismo patrón que adminProductKeys / authKeys).
export const adminUserKeys = {
  all: ["adminUsers"] as const,
};

// GET /api/admin/users — lista completa de administradores.
export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data } = await api.get("/admin/users");
  return AdminUserListSchema.parse(data);
}

// Un POST que devolvió 2xx YA creó al usuario. Si el body no valida el schema al
// pie de la letra, NO convertimos ese éxito en error (reintentar duplicaría al
// usuario): avisamos en consola y devolvemos el dato crudo. La invalidación de la
// lista revalida con datos ya parseados por getAdminUsers. `parse` estricto se
// reserva para lecturas.
function acceptWrite(op: string, data: unknown): AdminUser {
  const parsed = AdminUserSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(`${op}: la respuesta 2xx no valida AdminUserSchema`, parsed.error);
    return data as AdminUser;
  }
  return parsed.data;
}

// POST /api/admin/users — 201 con el usuario creado. 409 correo en uso, 400 validación.
export async function createAdminUser(input: CreateUserInput): Promise<AdminUser> {
  const { data } = await api.post("/admin/users", input);
  return acceptWrite("createAdminUser", data);
}

// DELETE /api/admin/users/:id — 400 si es la propia cuenta o el único propietario,
// 404 si no existe.
export async function deleteAdminUser(id: number): Promise<DeleteResponse> {
  const { data } = await api.delete(`/admin/users/${id}`);
  return DeleteResponseSchema.parse(data);
}
