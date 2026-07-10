import axios from "axios";
import { useAuthStore } from "@/store/authStore";

// Marca una petición como pública: no se le adjunta el Bearer y un 401 NO cierra
// la sesión ni redirige. Se usa en endpoints que el storefront consume sin sesión
// (p. ej. GET /admin/brand), para que un token viejo/expirado en localStorage no
// arrastre a un visitante público hacia /login. Ver lib/api/brand.ts.
//
// `skipAuthRedirect`: la petición SÍ lleva el Bearer (es autenticada), pero un 401
// NO cierra la sesión ni redirige — deja que la UI lo maneje inline. Se usa cuando
// el endpoint reutiliza 401 con otro significado que "token expirado" (p. ej. PUT
// /admin/account devuelve 401 por "contraseña actual incorrecta"). Ver lib/api/account.ts.
declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
    skipAuthRedirect?: boolean;
  }
}

/**
 * Instancia axios única para hablar con el backend.
 *
 * `NEXT_PUBLIC_API_URL` apunta al backend Express (ver BACKEND.md). Si no está
 * definida cae a `/api` (rutas API de Next, útiles para mocks/desarrollo).
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

// Request — adjunta el Bearer token de la sesión a cada petición.
api.interceptors.request.use((config) => {
  // El token se persiste en localStorage (solo cliente): en SSR no hay token que
  // adjuntar y el catálogo público no lo requiere. Por eso solo se adjunta en el
  // navegador. Las peticiones `skipAuth` (públicas) nunca lo llevan, así un token
  // viejo no provoca un 401 en un endpoint que no lo necesita.
  if (typeof window !== "undefined" && !config.skipAuth) {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response — si el backend responde 401 (token inválido/expirado), cierra la
// sesión y manda al login. Usa window.location para no acoplar el módulo al
// router de Next (este archivo puede importarse fuera de un componente).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Mismo motivo que en el request: el store/redirección solo aplican en el
    // navegador (localStorage + window.location no existen en SSR). Las peticiones
    // `skipAuth` (públicas, p. ej. la marca en el root layout) NO redirigen: un 401
    // ahí no debe expulsar a un visitante del storefront hacia /login. `skipAuthRedirect`
    // (autenticadas con 401 de otro significado, p. ej. contraseña incorrecta) tampoco.
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !error.config?.skipAuth &&
      !error.config?.skipAuthRedirect
    ) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);
