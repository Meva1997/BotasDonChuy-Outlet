"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  email: string;
}

interface AuthStore {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
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
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: "botas-don-chuy-auth",
    }
  )
);
