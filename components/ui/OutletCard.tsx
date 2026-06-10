interface OutletCardProps {
  name: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  stock: number | "ultima";
  imageSrc?: string;
}

export default function OutletCard({
  name,
  originalPrice,
  salePrice,
  discountPercent,
  stock,
  imageSrc,
}: OutletCardProps) {
  const formatPrice = (n: number) =>
    n.toLocaleString("es-MX", { minimumFractionDigits: 0 });

  return (
    <div className="group flex flex-col bg-stone-900 border border-amber-400/10 rounded-sm overflow-hidden hover:border-amber-400/30 transition-colors duration-300">
      {/* Image / Stamp area */}
      <div
        className="relative w-full aspect-4/3 overflow-hidden"
        style={{
          backgroundImage: imageSrc ? `url(${imageSrc})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#1c1209",
        }}
      >
        {/* Gradient vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#2c1a08_0%,#0d0a06_70%)]" />

        {/* Subtle grain texture overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
            backgroundSize: "128px 128px",
          }}
        />

        {/* Bottom fade into card */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-stone-900 to-transparent" />
      </div>

      {/* Card body */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
        {/* Product name */}
        <h3 className="font-serif text-amber-50 text-base leading-snug group-hover:text-amber-200 transition-colors duration-200">
          {name}
        </h3>

        {/* Price row */}
        <div className="flex items-baseline gap-3">
          <span className="font-sans text-amber-100/35 text-xs line-through">
            ${formatPrice(originalPrice)}
          </span>
          <span className="font-serif text-amber-400 text-2xl leading-none">
            ${formatPrice(salePrice)}
          </span>
          <span className="ml-auto font-sans text-amber-400/60 text-xs tracking-wide">
            −{discountPercent}%
          </span>
        </div>

        {/* Stock indicator */}
        <p className="font-sans text-amber-100/40 text-xs tracking-wide">
          {stock === "ultima" ? "Última pieza" : `Solo ${stock} disponibles`}
        </p>
      </div>
    </div>
  );
}
