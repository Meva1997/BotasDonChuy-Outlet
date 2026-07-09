"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBrandSettings, brandKeys } from "@/lib/api/brand";
import { resolveBrand, type ResolvedBrand } from "@/lib/brand";

// Marca resuelta para todo el storefront. El valor por defecto del context es la
// marca estática (BRAND) por si algún consumidor se monta fuera del provider.
const BrandContext = createContext<ResolvedBrand>(resolveBrand(null));

// Hidrata la marca desde GET /api/admin/brand (público) y la expone vía context.
// `initialData`/fallback = BRAND, así que el primer render (y SSR) usa los
// defaults estáticos y se corrige tras el fetch sin estado indefinido.
export default function BrandProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = useQuery({
    queryKey: brandKeys.detail(),
    queryFn: getBrandSettings,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <BrandContext.Provider value={resolveBrand(data)}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand(): ResolvedBrand {
  return useContext(BrandContext);
}
