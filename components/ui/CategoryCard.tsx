import Link from "next/link";

interface CategoryCardProps {
  title: string;
  count: number;
  href: string;
  imageSrc?: string;
}

export default function CategoryCard({
  title,
  count,
  href,
  imageSrc,
}: CategoryCardProps) {
  return (
    <Link href={href} className="block w-full my-10">
      <article
        className="relative w-full h-56 sm:h-64 md:h-80 rounded-sm overflow-hidden group"
        style={{
          backgroundImage: imageSrc ? `url(${imageSrc})` : undefined,
          backgroundColor: "#2c1f10",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-amber-400/0 group-hover:bg-amber-400/5 transition-colors duration-300" />

        <footer className="absolute bottom-0 left-0 right-0 px-5 py-5 flex items-end justify-between">
          <span className="text-amber-50 font-serif text-xl">{title}</span>
          <span className="text-amber-100/40 text-xs tracking-[0.2em] uppercase">
            {count} Piezas →
          </span>
        </footer>
      </article>
    </Link>
  );
}
