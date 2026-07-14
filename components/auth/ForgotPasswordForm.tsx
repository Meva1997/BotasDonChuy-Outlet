"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  forgotPasswordSchema,
  type ForgotPasswordData,
} from "@/schemas/auth";
import { forgotPassword } from "@/lib/api/auth";
import { TextField } from "@/components/ui/FormControls";
import ResetCodeForm from "@/components/auth/ResetCodeForm";
import NewPasswordForm from "@/components/auth/NewPasswordForm";

type Step = "email" | "code" | "password";

/**
 * Wizard de recuperación de contraseña en 3 pasos (Fase 10):
 *   email → código de 5 dígitos → nueva contraseña → /login.
 * El estado vive local (no se persiste): un refresh reinicia en el paso 1.
 */
export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (_data, variables) => {
      setEmail(variables.email);
      setStep("code");
    },
  });

  const onSubmit = handleSubmit((data) => mutation.mutate(data));

  const errorMessage =
    axios.isAxiosError(mutation.error) && mutation.error.response?.status === 429
      ? "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
      : "No pudimos enviar el correo. Inténtalo de nuevo.";

  if (step === "code") {
    return (
      <ResetCodeForm
        email={email}
        onVerified={(verified) => {
          setCode(verified);
          setStep("password");
        }}
      />
    );
  }

  if (step === "password") {
    return (
      <NewPasswordForm
        email={email}
        code={code}
        onExpired={() => {
          setCode("");
          setStep("code");
        }}
      />
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

      {mutation.isError && (
        <p role="alert" className="text-[12px] text-red-400/90">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="btn-shimmer w-full bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? "Enviando…" : "Enviar código"}
      </button>
    </form>
  );
}
