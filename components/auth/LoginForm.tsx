"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { loginSchema, type LoginData } from "@/schemas/auth";
import { login } from "@/lib/api/auth";
import { TextField } from "@/components/checkout/FormControls";
import { useAuthStore } from "@/store/authStore";

// Traduce el error de axios en un mensaje para el usuario.
function loginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return "Correo o contraseña incorrectos.";
    if (error.response?.status === 429)
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  return "No pudimos iniciar sesión. Inténtalo de nuevo.";
}

export default function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data.token, data.user);
      router.push("/admin");
    },
  });

  const onSubmit = handleSubmit((data) => mutation.mutate(data));

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

      <div>
        <TextField
          id="password"
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="text-right mt-2">
          <Link
            href="/forgot-password"
            className="text-[11px] tracking-[0.15em] uppercase text-amber-100/40 hover:text-amber-400 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>

      {mutation.isError && (
        <p role="alert" className="text-[12px] text-red-400/90">
          {loginErrorMessage(mutation.error)}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="btn-shimmer w-full bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? "Ingresando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
