import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.149"],
  images: {
    // Hosts permitidos para next/image. Ajustar al CDN real del catálogo cuando
    // el backend sirva imágenes de producto (p. ej. Cloudinary). Las previews
    // locales de subida usan blob: URLs con <img> crudo (next/image no las
    // optimiza) — ver convención de imágenes en CLAUDE.md.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
