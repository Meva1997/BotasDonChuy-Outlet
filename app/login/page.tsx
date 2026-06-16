import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Iniciar sesión | Botas Don Chuy Outlet",
  description: "Inicia sesión en tu cuenta de Botas Don Chuy Outlet.",
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
