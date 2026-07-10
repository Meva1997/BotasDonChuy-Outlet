"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { BTN_OUTLINE } from "./config/formUi";
import AccountCard from "./config/AccountCard";
import AdminsCard from "./config/AdminsCard";

export default function ConfigSection() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="max-w-6xl">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <h2 className="font-serif text-amber-50 text-2xl sm:text-3xl tracking-wide">
          Configuración
        </h2>
        <button onClick={handleLogout} className={BTN_OUTLINE}>
          Cerrar Sesión
        </button>
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AccountCard />
        <AdminsCard />
      </div>
    </div>
  );
}
