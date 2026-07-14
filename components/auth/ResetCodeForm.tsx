"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { verifyResetCode, forgotPassword } from "@/lib/api/auth";
import CodeInput from "@/components/auth/CodeInput";

const CODE_LENGTH = 5;

// 400 = "Código inválido o expirado" (genérico), 429 = rate-limit.
function verifyErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 400) return "Código inválido o expirado.";
    if (error.response?.status === 429)
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  return "No pudimos verificar el código. Inténtalo de nuevo.";
}

// Reenvío: 429 = rate-limit; cualquier otro fallo, mensaje genérico.
function resendErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 429)
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  return "No pudimos reenviar el código. Inténtalo de nuevo.";
}

interface ResetCodeFormProps {
  email: string;
  /** Se llama con el código verificado para avanzar al paso de nueva contraseña. */
  onVerified: (code: string) => void;
}

export default function ResetCodeForm({ email, onVerified }: ResetCodeFormProps) {
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: verifyResetCode,
    onSuccess: (_data, variables) => onVerified(variables.code),
  });

  const resendMutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      setResent(true);
      setCode("");
      verifyMutation.reset();
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== CODE_LENGTH) return;
    setResent(false);
    verifyMutation.mutate({ email, code });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <p className="text-amber-100/50 text-sm leading-relaxed">
        Ingresa el código de 5 dígitos que enviamos a{" "}
        <span className="text-amber-400">{email}</span>.
      </p>

      <div>
        <label className="block text-[10px] tracking-[0.25em] uppercase text-amber-100/70 mb-3">
          Código de verificación
        </label>
        <CodeInput
          value={code}
          onChange={setCode}
          error={verifyMutation.isError}
          disabled={verifyMutation.isPending}
          autoFocus
        />
        {verifyMutation.isError && (
          <p role="alert" className="mt-2 text-[12px] text-red-400/90">
            {verifyErrorMessage(verifyMutation.error)}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={code.length !== CODE_LENGTH || verifyMutation.isPending}
        className="btn-shimmer w-full bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {verifyMutation.isPending ? "Verificando…" : "Verificar código"}
      </button>

      <div className="text-center text-[11px] tracking-[0.15em] uppercase text-amber-100/40">
        {resent ? (
          <span className="text-amber-400">Código reenviado. Revisa tu correo.</span>
        ) : (
          <>
            ¿No llegó?{" "}
            <button
              type="button"
              onClick={() => resendMutation.mutate({ email })}
              disabled={resendMutation.isPending}
              className="text-amber-100/60 hover:text-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {resendMutation.isPending ? "Reenviando…" : "Reenviar código"}
            </button>
            {resendMutation.isError && (
              <p role="alert" className="mt-2 normal-case tracking-normal text-red-400/90">
                {resendErrorMessage(resendMutation.error)}
              </p>
            )}
          </>
        )}
      </div>
    </form>
  );
}
