import type { AuthUser } from "@/lib/api/auth";
import type { AdminUser } from "@/lib/api/adminUsers";

// Fixtures compartidas por components/admin/config/__tests__/.
//
// Ojo con los ids: `AuthUser.id` es **string** (viene del JWT) y `AdminUser.id`
// es **number** (viene de la tabla). `AdminsCard` compara `String(u.id) ===
// currentUser?.id` justamente por eso, y de esa comparación depende no ofrecerle
// al dueño el botón de borrarse a sí mismo.

export function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "1",
    name: "Don Chuy",
    email: "duenio@botasdonchuy.com",
    role: "owner",
    ...overrides,
  };
}

export function makeAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 1,
    name: "Don Chuy",
    email: "duenio@botasdonchuy.com",
    role: "owner",
    ...overrides,
  };
}
