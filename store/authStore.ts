"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/lib/api/auth";

// `AuthUser` ({ id, name, email, role }) es la forma que devuelve el backend;
// vive en lib/api/auth.ts como schema Zod. Import de solo-tipo → sin ciclo en
// runtime (client → authStore, auth → client).
export type { AuthUser };

interface AuthStore {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

/**
 * Fuente única de la sesión del admin. El token que aquí se guarda es el que
 * lee el axios client (`lib/api/client.ts`) para el header Authorization y el
 * que verifica `AdminGuard` para proteger `/admin`.
 *
 * Persistido en localStorage (key `botas-don-chuy-auth`) para que la sesión
 * sobreviva recargas — mismo patrón que `store/cartStore.ts`.
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      login: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: "botas-don-chuy-auth",
    }
  )
);
