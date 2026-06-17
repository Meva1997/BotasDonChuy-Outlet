import Link from "next/link";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex-1 grid lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca — solo en pantallas grandes */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-amber-900/30 bg-tobacco-950 px-14 py-12">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-amber-700/20 blur-[120px] animate-glow-pulse" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-500/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent, transparent 38px, rgba(245,158,11,0.6) 38px, rgba(245,158,11,0.6) 39px)",
          }}
        />

        <Link
          href="/"
          className="relative z-10 font-serif text-2xl text-amber-50 tracking-wide"
        >
          Botas Don Chuy
        </Link>

        <div className="relative z-10 max-w-md">
          <span className="block text-[11px] tracking-[0.3em] uppercase text-amber-400/80 mb-5">
            Desde Celaya, Guanajuato
          </span>
          <p className="font-serif text-4xl leading-[1.15] text-amber-50/95">
            Hechas para durar,
            <br />
            vestidas para destacar.
          </p>
          <div className="mt-8 h-px w-16 bg-amber-400/50" />
          <p className="mt-6 text-sm text-amber-100/40 leading-relaxed">
            Botas, sombreros y prendas de piel forjadas con tradición charra
            y rematadas a mano, pieza por pieza.
          </p>
        </div>

        <p className="relative z-10 text-[11px] tracking-[0.25em] uppercase text-amber-100/30">
          © {new Date().getFullYear()} Botas Don Chuy
        </p>
      </aside>

      {/* Panel del formulario */}
      <div className="relative flex flex-col">
        <div className="px-6 py-6 lg:px-12">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-amber-100/50 hover:text-amber-400 transition-colors"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            Volver a la tienda
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm animate-fade-in-up">
            <div className="text-center mb-10">
              <Link
                href="/"
                className="font-serif text-2xl text-amber-50 lg:hidden"
              >
                Botas Don Chuy
              </Link>
              <h1 className="font-serif text-2xl text-amber-50 mt-6 lg:mt-0">
                {title}
              </h1>
              {subtitle && (
                <p className="text-amber-100/40 text-xs tracking-wide mt-2">
                  {subtitle}
                </p>
              )}
              <div className="mx-auto mt-5 h-px w-10 bg-amber-400/40" />
            </div>

            <div className="border border-amber-900/40 bg-stone-900/30 backdrop-blur-sm p-8 shadow-[0_0_40px_-15px_rgba(245,158,11,0.15)]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
