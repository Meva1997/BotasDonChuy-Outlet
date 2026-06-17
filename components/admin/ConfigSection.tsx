"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { useAuthStore } from "@/store/authStore";

const INPUT_BASE =
  "w-full bg-stone-800/80 border border-amber-400/20 text-amber-50 px-4 py-3 text-sm focus:outline-none focus:border-amber-400/50 focus-visible:ring-2 focus-visible:ring-amber-400/60 transition-colors placeholder:text-amber-100/20";

const LABEL_BASE =
  "block text-amber-100/50 uppercase tracking-[0.25em] text-[10px] mb-2";

const BTN_OUTLINE =
  "border border-amber-400 text-amber-400 uppercase tracking-[0.25em] text-[10px] px-6 py-3 hover:bg-amber-400/10 active:bg-amber-400/20 focus-visible:ring-2 focus-visible:ring-amber-400/60 transition-colors cursor-pointer";

export default function ConfigSection() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const [email, setEmail] = useState<string>(BRAND.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTempPassword, setNewTempPassword] = useState("");
  const [newRole, setNewRole] = useState("Administrador");

  return (
    <div className="max-w-6xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-10">
        <h2 className="font-serif text-amber-50 text-3xl tracking-wide">
          Configuración
        </h2>
        <button onClick={handleLogout} className={BTN_OUTLINE}>
          Cerrar Sesión
        </button>
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ────────── Mi cuenta ────────── */}
        <div className="bg-stone-900 border border-amber-400/10 p-8">
          <h3 className="font-serif text-amber-50 text-2xl mb-1">Mi cuenta</h3>
          <p className="text-amber-100/40 text-sm mb-8">
            Correo y contraseña con los que entras al panel.
          </p>

          {/* Email */}
          <div className="mb-5">
            <label className={LABEL_BASE}>Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_BASE}
            />
          </div>
          <button className={`${BTN_OUTLINE} mb-10`}>Actualizar Correo</button>

          {/* Password fields */}
          <div className="space-y-5">
            <div>
              <label className={LABEL_BASE}>Contraseña Actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={INPUT_BASE}
              />
            </div>
            <div>
              <label className={LABEL_BASE}>Nueva Contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={INPUT_BASE}
              />
            </div>
            <div>
              <label className={LABEL_BASE}>Confirmar Nueva Contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={INPUT_BASE}
              />
            </div>
          </div>
          <button className={`${BTN_OUTLINE} mt-6`}>Cambiar Contraseña</button>
        </div>

        {/* ────────── Administradores ────────── */}
        <div className="bg-stone-900 border border-amber-400/10 p-8">
          <h3 className="font-serif text-amber-50 text-2xl mb-1">
            Administradores
          </h3>
          <p className="text-amber-100/40 text-sm mb-6">
            Quién puede entrar a este panel.
          </p>

          {/* Admin row */}
          <div className="flex items-center justify-between py-4 border-b border-amber-400/10 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-900/50 border border-amber-400/30 flex items-center justify-center shrink-0">
                <span className="font-serif text-amber-400 text-lg leading-none">
                  D
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-50 text-sm font-medium">
                    Don Chuy
                  </span>
                  <span className="border border-amber-400/40 text-amber-400/70 text-[9px] uppercase tracking-widest px-1.5 py-0.5 leading-none">
                    Tú
                  </span>
                </div>
                <span className="text-amber-100/40 text-xs">{BRAND.email}</span>
              </div>
            </div>
            <span className="border border-amber-400 text-amber-400 uppercase tracking-[0.2em] text-[9px] px-3 py-1.5 shrink-0">
              Propietario
            </span>
          </div>

          {/* Add admin */}
          <h4 className="font-serif text-amber-50 text-xl mb-6">
            Agregar administrador
          </h4>
          <div className="space-y-5">
            <div>
              <label className={LABEL_BASE}>Nombre</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={INPUT_BASE}
              />
            </div>
            <div>
              <label className={LABEL_BASE}>Correo</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={INPUT_BASE}
              />
            </div>
            <div>
              <label className={LABEL_BASE}>Contraseña Temporal</label>
              <input
                type="password"
                value={newTempPassword}
                onChange={(e) => setNewTempPassword(e.target.value)}
                className={INPUT_BASE}
              />
            </div>
            <div>
              <label className={LABEL_BASE}>Rol</label>
              <div className="relative">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className={`${INPUT_BASE} appearance-none cursor-pointer pr-10`}
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Editor">Editor</option>
                </select>
                {/* custom chevron */}
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <svg
                    className="w-3.5 h-3.5 text-amber-400/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <button className="mt-6 bg-amber-700/80 border border-amber-600/80 text-amber-50 uppercase tracking-[0.25em] text-[10px] px-8 py-3 hover:bg-amber-700 active:bg-amber-800 focus-visible:ring-2 focus-visible:ring-amber-400/60 transition-colors cursor-pointer">
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
