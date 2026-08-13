"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { authKeys } from "@/lib/api/auth";
import { adminUserKeys } from "@/lib/api/adminUsers";
import { updateOwnAccount, type AccountUpdateInput } from "@/lib/api/account";
import { updateAccountSchema, type UpdateAccountData } from "@/schemas/users";
import { LABEL_BASE, BTN_OUTLINE, inputCls, FieldError } from "./formUi";

// ── Mapeo de errores de axios a mensajes en español ──
function accountErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return "Contraseña actual incorrecta.";
    if (error.response?.status === 409) return "Ese correo ya está en uso.";
    if (error.response?.status === 400)
      return error.response.data?.message ?? "Revisa los datos ingresados.";
  }
  return "No pudimos guardar los cambios. Inténtalo de nuevo.";
}

export default function AccountCard() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateAccountData>({
    resolver: zodResolver(updateAccountSchema),
    mode: "onBlur",
    defaultValues: {
      email: user?.email ?? "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: updateOwnAccount,
    onSuccess: (_res, variables) => {
      // Reflejar el nuevo correo de inmediato + revalidar la sesión y la lista.
      if (variables.email && user && variables.email !== user.email) {
        setUser({ ...user, email: variables.email });
      }
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      // Conservar el correo, limpiar las contraseñas.
      reset({
        email: variables.email ?? user?.email ?? "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
  });

  const onSubmit = handleSubmit((data) => {
    const payload: AccountUpdateInput = {
      currentPassword: data.currentPassword,
      email: data.email,
    };
    if (data.newPassword) {
      payload.newPassword = data.newPassword;
      payload.confirmPassword = data.confirmPassword;
    }
    mutation.mutate(payload);
  });

  return (
    <div className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8">
      <h3 className="font-serif text-amber-50 text-2xl mb-1">Mi cuenta</h3>
      <p className="text-amber-100/40 text-sm mb-8">
        Correo y contraseña con los que entras al panel. Confirma con tu
        contraseña actual para guardar.
      </p>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {/* Email */}
        <div>
          <label className={LABEL_BASE} htmlFor="account-form-email">
            Correo
          </label>
          <input
            id="account-form-email"
            type="email"
            autoComplete="email"
            className={inputCls(!!errors.email)}
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>

        {/* Contraseña actual (obligatoria para cualquier cambio) */}
        <div>
          <label className={LABEL_BASE} htmlFor="account-form-current-password">
            Contraseña Actual
          </label>
          <input
            id="account-form-current-password"
            type="password"
            autoComplete="current-password"
            className={inputCls(!!errors.currentPassword)}
            {...register("currentPassword")}
          />
          <FieldError message={errors.currentPassword?.message} />
        </div>

        {/* Nueva contraseña (opcional) */}
        <div>
          <label className={LABEL_BASE} htmlFor="account-form-new-password">
            Nueva Contraseña (opcional)
          </label>
          <input
            id="account-form-new-password"
            type="password"
            autoComplete="new-password"
            className={inputCls(!!errors.newPassword)}
            {...register("newPassword")}
          />
          <FieldError message={errors.newPassword?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            Mínimo 8 caracteres, con una mayúscula, un número y un signo.
          </p>
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="account-form-confirm-password">
            Confirmar Nueva Contraseña
          </label>
          <input
            id="account-form-confirm-password"
            type="password"
            autoComplete="new-password"
            className={inputCls(!!errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          <FieldError message={errors.confirmPassword?.message} />
        </div>

        {mutation.isError && (
          <p role="alert" className="text-[12px] text-red-400/90">
            {accountErrorMessage(mutation.error)}
          </p>
        )}
        {mutation.isSuccess && !mutation.isPending && (
          <p className="text-[12px] text-amber-400/70">Cambios guardados.</p>
        )}

        <button type="submit" disabled={mutation.isPending} className={BTN_OUTLINE}>
          {mutation.isPending ? "Guardando…" : "Guardar Cambios"}
        </button>
      </form>
    </div>
  );
}
