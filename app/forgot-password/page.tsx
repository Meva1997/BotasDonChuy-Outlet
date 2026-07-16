import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Recuperar contraseña",
  description: "Recupera el acceso a tu cuenta de Botas Don Chuy Outlet.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Restablece el acceso a tu cuenta"
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
