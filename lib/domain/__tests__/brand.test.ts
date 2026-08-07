import { BRAND, resolveBrand } from "../brand";
import type { BrandSettings } from "@/lib/api/brand";

// resolveBrand hace un merge campo-por-campo: solo el subconjunto que el backend
// controla (brandName/heroText/tagline/cartNotice/footerNote/logoUrl) se toma de
// `settings`, el resto (namePrimary/nameAccent/email/instagram) SIEMPRE sale de
// BRAND porque no existe en el backend — mezclar esa frontera sería el bug típico.

function makeSettings(overrides: Partial<BrandSettings> = {}): BrandSettings {
  return {
    brandName: "Marca Nueva",
    heroText: "Nuevo eyebrow",
    tagline: "Línea uno\nLínea dos",
    cartNotice: "Nuevo aviso",
    footerNote: "Nueva nota",
    logoUrl: "https://cdn.example.com/logo.png",
    ...overrides,
  };
}

describe("resolveBrand", () => {
  it("sin settings (null/undefined), todo sale de BRAND y logoUrl es null", () => {
    expect(resolveBrand(null)).toEqual({
      name: BRAND.name,
      namePrimary: BRAND.namePrimary,
      nameAccent: BRAND.nameAccent,
      email: BRAND.email,
      instagram: BRAND.instagram,
      heroText: BRAND.heroText,
      taglineLines: [...BRAND.taglineLines],
      cartNotice: BRAND.cartNotice,
      footerNote: BRAND.footerNote,
      logoUrl: null,
    });
    expect(resolveBrand(undefined)).toEqual(resolveBrand(null));
    expect(resolveBrand()).toEqual(resolveBrand(null));
  });

  it("toma del backend solo los campos que controla", () => {
    const settings = makeSettings();
    const resolved = resolveBrand(settings);

    expect(resolved.name).toBe(settings.brandName);
    expect(resolved.heroText).toBe(settings.heroText);
    expect(resolved.taglineLines).toEqual(["Línea uno", "Línea dos"]);
    expect(resolved.cartNotice).toBe(settings.cartNotice);
    expect(resolved.footerNote).toBe(settings.footerNote);
    expect(resolved.logoUrl).toBe(settings.logoUrl);
  });

  it("namePrimary/nameAccent/email/instagram nunca vienen del backend, aunque settings los tuviera", () => {
    const resolved = resolveBrand(makeSettings());

    expect(resolved.namePrimary).toBe(BRAND.namePrimary);
    expect(resolved.nameAccent).toBe(BRAND.nameAccent);
    expect(resolved.email).toBe(BRAND.email);
    expect(resolved.instagram).toBe(BRAND.instagram);
  });

  it("tagline vacío (falsy) cae al taglineLines default de BRAND", () => {
    const settings = makeSettings({ tagline: "" });

    expect(resolveBrand(settings).taglineLines).toEqual([...BRAND.taglineLines]);
  });

  it("logoUrl null explícito se respeta (no cae a un default)", () => {
    expect(resolveBrand(makeSettings({ logoUrl: null })).logoUrl).toBeNull();
  });
});
