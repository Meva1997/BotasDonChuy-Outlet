"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import {
  adminUserKeys,
  getAdminUsers,
  createAdminUser,
  deleteAdminUser,
  type AdminUser,
} from "@/lib/api/adminUsers";
import { createUserSchema, type CreateUserData } from "@/schemas/users";
import { LABEL_BASE, inputCls, FieldError } from "./formUi";

const ROLE_LABEL: Record<AdminUser["role"], string> = {
  owner: "Propietario",
  admin: "Administrador",
};

function createUserErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 409) return "Ese correo ya está en uso.";
    if (error.response?.status === 400)
      return error.response.data?.message ?? "Revisa los datos ingresados.";
  }
  return "No pudimos crear al administrador. Inténtalo de nuevo.";
}

function deleteUserErrorMessage(error: unknown): string {
  // El backend devuelve mensajes explícitos (único propietario, etc.).
  if (axios.isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message as string;
  }
  return "No pudimos eliminar al administrador.";
}

export default function AdminsCard() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const {
    data: users,
    isPending,
    isError,
  } = useQuery({
    queryKey: adminUserKeys.all,
    queryFn: getAdminUsers,
    staleTime: 60 * 1000,
  });

  const [confirmId, setConfirmId] = useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      setConfirmId(null);
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", tempPassword: "", role: "admin" },
  });

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      reset({ name: "", email: "", tempPassword: "", role: "admin" });
    },
  });

  const onSubmit = handleSubmit((data) => createMutation.mutate(data));

  return (
    <div className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8">
      <h3 className="font-serif text-amber-50 text-2xl mb-1">Administradores</h3>
      <p className="text-amber-100/40 text-sm mb-6">
        Quién puede entrar a este panel.
      </p>

      {/* Lista */}
      <div className="mb-8">
        {isPending && (
          <p className="text-amber-100/40 text-sm py-4">Cargando…</p>
        )}
        {isError && (
          <p role="alert" className="text-red-400/90 text-sm py-4">
            No pudimos cargar los administradores.
          </p>
        )}

        {users?.map((u) => {
          const isSelf = String(u.id) === currentUser?.id;
          const initial = u.name.trim().charAt(0).toUpperCase() || "?";
          return (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 py-4 border-b border-amber-400/10"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-amber-900/50 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <span className="font-serif text-amber-400 text-lg leading-none">
                    {initial}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-50 text-sm font-medium truncate">
                      {u.name}
                    </span>
                    {isSelf && (
                      <span className="shrink-0 border border-amber-400/40 text-amber-400/70 text-[9px] uppercase tracking-widest px-1.5 py-0.5 leading-none">
                        Tú
                      </span>
                    )}
                  </div>
                  <span className="block text-amber-100/40 text-xs truncate">
                    {u.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-auto">
                <span className="border border-amber-400 text-amber-400 uppercase tracking-[0.2em] text-[9px] px-3 py-1.5">
                  {ROLE_LABEL[u.role]}
                </span>
                {/* No se ofrece borrar la propia cuenta (el backend igual lo rechaza). */}
                {!isSelf &&
                  (confirmId === u.id ? (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(u.id)}
                        className="text-[10px] uppercase tracking-widest text-red-400 hover:text-red-300 disabled:opacity-50 cursor-pointer"
                      >
                        {deleteMutation.isPending ? "…" : "Confirmar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        deleteMutation.reset();
                        setConfirmId(u.id);
                      }}
                      className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Eliminar
                    </button>
                  ))}
              </div>
            </div>
          );
        })}

        {deleteMutation.isError && (
          <p role="alert" className="mt-3 text-[12px] text-red-400/90">
            {deleteUserErrorMessage(deleteMutation.error)}
          </p>
        )}
      </div>

      {/* Alta */}
      <h4 className="font-serif text-amber-50 text-xl mb-6">
        Agregar administrador
      </h4>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <label className={LABEL_BASE}>Nombre</label>
          <input
            type="text"
            className={inputCls(!!errors.name)}
            {...register("name")}
          />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <label className={LABEL_BASE}>Correo</label>
          <input
            type="email"
            className={inputCls(!!errors.email)}
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <label className={LABEL_BASE}>Contraseña Temporal</label>
          <input
            type="password"
            autoComplete="new-password"
            className={inputCls(!!errors.tempPassword)}
            {...register("tempPassword")}
          />
          <FieldError message={errors.tempPassword?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            Mínimo 8 caracteres, con una mayúscula, un número y un signo.
          </p>
        </div>
        <div>
          <label className={LABEL_BASE}>Rol</label>
          <div className="relative">
            <select
              className={`${inputCls(!!errors.role)} appearance-none cursor-pointer pr-10`}
              {...register("role")}
            >
              <option value="admin">Administrador</option>
              <option value="owner">Propietario</option>
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
          <FieldError message={errors.role?.message} />
        </div>

        {createMutation.isError && (
          <p role="alert" className="text-[12px] text-red-400/90">
            {createUserErrorMessage(createMutation.error)}
          </p>
        )}
        {createMutation.isSuccess && !createMutation.isPending && (
          <p className="text-[12px] text-amber-400/70">Administrador agregado.</p>
        )}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="mt-6 bg-amber-700/80 border border-amber-600/80 text-amber-50 uppercase tracking-[0.25em] text-[10px] px-8 py-3 hover:bg-amber-700 active:bg-amber-800 focus-visible:ring-2 focus-visible:ring-amber-400/60 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? "Agregando…" : "Agregar"}
        </button>
      </form>
    </div>
  );
}
