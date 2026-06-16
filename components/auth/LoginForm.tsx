"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginData } from "@/schemas/auth";
import { TextField } from "@/components/checkout/FormControls";

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async (data) => {
    // TODO: reemplazar por una mutación de TanStack Query cuando el backend esté listo.
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log(data);
  });

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

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-shimmer w-full bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
