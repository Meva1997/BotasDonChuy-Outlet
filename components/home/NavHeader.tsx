import Link from "next/link";

const NavLinks = [
  { href: "/botas", label: "Botas" },
  { href: "/sombreros", label: "Sombreros" },
  { href: "/ropa", label: "Ropa" },
];

export default function NavHeader() {
  return (
    <header className="border-b border-amber-900/40">
      <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="font-serif text-xl">
          <span className="text-amber-50 font-normal">Botas Don Chuy </span>
          <span className="italic text-amber-400">Outlet</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-10">
          {NavLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs tracking-[0.2em] uppercase text-amber-100/60 hover:text-amber-100 transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="text-xs tracking-[0.15em] uppercase border border-amber-100/20 text-amber-100/50 px-4 py-2 hover:border-amber-100/40 hover:text-amber-100/80 transition-colors duration-200"
          >
            Admin
          </Link>
          <Link
            href="/carrito"
            className="text-xs tracking-[0.15em] uppercase border border-amber-400/60 text-amber-400 px-4 py-2 hover:bg-amber-400/10 transition-colors duration-200"
          >
            Carrito (0)
          </Link>
        </div>

      </div>
    </header>
  );
}
