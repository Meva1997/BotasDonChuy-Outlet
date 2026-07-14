"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { resetPasswordSchema, type ResetPasswordData } from "@/schemas/auth";
import { resetPassword } from "@/lib/api/auth";
import { TextField } from "@/components/ui/FormControls";

// 400 = código inválido/expirado (la complejidad ya se valida en cliente antes
// de enviar), 429 = rate-limit.
function resetErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 400)
      return "El código expiró o ya no es válido. Solicita uno nuevo.";
    if (error.response?.status === 429)
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  return "No pudimos cambiar la contraseña. Inténtalo de nuevo.";
}

interface NewPasswordFormProps {
  email: string;
  code: string;
  /** Se llama cuando el código expiró/dejó de ser válido (400) para volver al
   *  paso de código y poder solicitar uno nuevo. */
  onExpired?: () => void;
}

export default function NewPasswordForm({
  email,
  code,
  onExpired,
}: NewPasswordFormProps) {
  const router = useRouter();
  const [succeeded, setSucceeded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    // email/code no se renderizan: viajan por el form para revalidar el schema
    // completo (incluye el refine de coincidencia de contraseñas).
    defaultValues: { email, code },
  });

  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => setSucceeded(true),
  });

  useEffect(() => {
    if (!succeeded) return;
    const t = setTimeout(() => router.push("/login"), 1800);
    return () => clearTimeout(t);
  }, [succeeded, router]);

  const onSubmit = handleSubmit((data) => mutation.mutate(data));

  // 400 = código expirado/inválido: la única salida es pedir un código nuevo.
  const codeExpired =
    axios.isAxiosError(mutation.error) &&
    mutation.error.response?.status === 400;

  if (succeeded) {
    return (
      <div className="text-center animate-fade-in-up">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 animate-ring-pop">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-amber-400">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-check-draw"
            />
          </svg>
        </div>
        <p className="text-amber-50 text-sm">
          Tu contraseña se actualizó. Redirigiéndote a iniciar sesión…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <p className="text-amber-100/50 text-sm leading-relaxed">
        Crea una nueva contraseña para{" "}
        <span className="text-amber-400">{email}</span>.
      </p>

      <TextField
        id="newPassword"
        label="Nueva contraseña"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />

      <TextField
        id="confirmPassword"
        label="Confirmar contraseña"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      {mutation.isError && (
        <div role="alert" className="space-y-2 text-[12px] text-red-400/90">
          <p>{resetErrorMessage(mutation.error)}</p>
          {codeExpired && onExpired && (
            <button
              type="button"
              onClick={onExpired}
              className="text-amber-100/60 hover:text-amber-400 transition-colors cursor-pointer underline underline-offset-2"
            >
              Solicitar un código nuevo
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="btn-shimmer w-full bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
