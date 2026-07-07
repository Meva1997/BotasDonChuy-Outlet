"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { authKeys, getMe } from "@/lib/api/auth";

/**
 * Protege /admin. Lee el token de la sesión (authStore) y, si no hay, redirige
 * a /login. El token vive en localStorage, así que se lee solo en cliente: con
 * `useSyncExternalStore` evitamos el desfase de hidratación (server no conoce
 * el token) sin parpadeo de contenido protegido.
 *
 * Además valida el token contra el backend (`GET /api/auth/me`) y rehidrata el
 * usuario. Si el token es inválido/expirado el backend responde 401 y el
 * interceptor de lib/api/client.ts cierra sesión y redirige a /login. El
 * `staleTime` evita revalidar en cada navegación dentro del panel.
 */
export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);

  // true solo tras montar en cliente — evita render server/cliente divergente.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const meQuery = useQuery({
    queryKey: authKeys.me,
    queryFn: getMe,
    enabled: hydrated && !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/login");
    }
  }, [hydrated, token, router]);

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data);
    }
  }, [meQuery.data, setUser]);

  // Sin token → spinner (el efecto de arriba redirige a /login). Con token,
  // mientras `/auth/me` está en vuelo (isPending) mostramos "Verificando…".
  // Una vez resuelto renderizamos el panel: si fue 401 el interceptor ya cerró
  // sesión (token → null → cae en la rama de arriba y redirige); si fue otro
  // error (500, red, parseo) NO bloqueamos el acceso —igual que el guard previo
  // solo-token— para no dejar al admin atrapado por una caída transitoria del
  // backend. Las llamadas posteriores con token inválido se caen por su cuenta.
  if (!hydrated || !token || meQuery.isPending) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-screen w-full items-center justify-center bg-tobacco-950"
      >
        <p className="text-[11px] tracking-[0.3em] uppercase text-amber-100/40">
          Verificando sesión…
        </p>
      </motion.div>
    );
  }

  return <>{children}</>;
}
