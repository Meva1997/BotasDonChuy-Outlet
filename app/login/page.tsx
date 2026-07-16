import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Iniciar sesión",
  description: "Inicia sesión en tu cuenta de Botas Don Chuy Outlet.",
  // Acceso al panel de administración: no es contenido público.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Accede a tu cuenta para continuar"
    >
      <LoginForm />
    </AuthShell>
  );
}
