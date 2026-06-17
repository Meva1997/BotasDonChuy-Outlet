"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";

/**
 * Protege /admin. Lee el token de la sesión (authStore) y, si no hay, redirige
 * a /login. El token vive en localStorage, así que se lee solo en cliente: con
 * `useSyncExternalStore` evitamos el desfase de hidratación (server no conoce
 * el token) sin parpadeo de contenido protegido.
 */
export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);

  // true solo tras montar en cliente — evita render server/cliente divergente.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/login");
    }
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
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
