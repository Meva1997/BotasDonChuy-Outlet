import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Recuperar contraseña | Botas Don Chuy Outlet",
  description: "Recupera el acceso a tu cuenta de Botas Don Chuy Outlet.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te enviaremos instrucciones a tu correo"
    >
      <ForgotPasswordForm />
      <p className="text-center text-[11px] tracking-[0.15em] uppercase text-amber-100/40 mt-6">
        <Link
          href="/login"
          className="hover:text-amber-400 transition-colors"
        >
          ← Volver a iniciar sesión
        </Link>
      </p>
    </AuthShell>
  );
}
