"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  type ForgotPasswordData,
} from "@/schemas/auth";
import { TextField } from "@/components/checkout/FormControls";

export default function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async (data) => {
    // TODO: reemplazar por una mutación de TanStack Query cuando el backend esté listo.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSentTo(data.email);
  });

  if (sentTo) {
    return (
      <div className="text-center animate-fade-in-up">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 animate-ring-pop">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-amber-400"
          >
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
          Te enviamos un correo a{" "}
          <span className="text-amber-400">{sentTo}</span> con instrucciones
          para restablecer tu contraseña.
        </p>
        <p className="text-amber-100/40 text-xs mt-2">
          Revisa también tu carpeta de spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <TextField
        id="email"
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-shimmer w-full bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Enviando…" : "Enviar instrucciones"}
      </button>
    </form>
  );
}
