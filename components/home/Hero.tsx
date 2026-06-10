import Link from "next/link";
import CategoryCard from "../ui/CategoryCard";

export default function Hero() {
  return (
    <main>
      {/* Hero section */}
      <section className="relative flex flex-col items-center justify-center text-center min-h-[88vh] px-8 gap-8">
        {/* Eyebrow */}
        <p className="text-xs tracking-[0.35em] uppercase text-amber-400/60">
          Liquidación Final · Sin Reposición
        </p>

        {/* Title */}
        <h1
          className="font-serif font-bold leading-none text-amber-50"
          style={{ fontSize: "clamp(5rem, 12vw, 9rem)" }}
        >
          Botas Don Chuy
          <br />
          <span className="italic text-amber-100/90">Outlet</span>
        </h1>

        {/* Subtitle */}
        <div className="space-y-1 text-amber-100/50 text-sm tracking-wide">
          <p>Piezas únicas. Sin reposición.</p>
          <p>Cuando se acaba, se acaba.</p>
        </div>

        {/* CTA Button */}
        <Link
          href="/outlet"
          className="text-xs tracking-[0.3em] uppercase border  px-12 py-4 border-amber-400/70 text-amber-400 duration-300 mt-2 hover:scale-105 transition-all"
        >
          Ver Outlet
        </Link>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-px h-14 bg-linear-to-b from-amber-400/40 to-transparent" />
      </section>

      {/* Category cards */}
      <section className="flex justify-center gap-6 max-w-5xl mx-auto pb-24 px-8">
        <CategoryCard title="Botas" count={3} href="/botas" imageSrc="" />
        <CategoryCard
          title="Sombreros"
          count={3}
          href="/sombreros"
          imageSrc=""
        />
        <CategoryCard title="Ropa" count={3} href="/ropa" imageSrc="" />
      </section>
    </main>
  );
}
