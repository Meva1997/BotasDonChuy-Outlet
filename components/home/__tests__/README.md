# Tests de `components/home/`

Home y navegación global (Fase 10 del roadmap) — presentacional, sin mutaciones ni dinero de
por medio, así que el criterio aquí es cobertura de ramas más que riesgo de negocio.

| Archivo | Cubre |
|---|---|
| `Hero.test.tsx` | Los tres `useCategoryCount` (uno por categoría, `getProducts({ categoria, perPage: 1 })`), que solo leen `total` (cae a 0 antes de resolver, sin loader propio), copy de marca (vía el default del context de `BrandProvider`, sin envolver con el provider real) y el CTA a `/outlet` |
| `NavHeader.test.tsx` | Links desde `CATEGORIES`, conteo real del carrito, menú móvil (abrir/cerrar por hamburguesa, por click en un link, por click fuera del header — y que un click **dentro** no lo cierra) |
| `Footer.test.tsx` | Las tres secciones (Tienda/Información/Contacto), que solo Instagram abre en pestaña nueva, y el copyright con el año actual |
| `CategoryCard.test.tsx` | Título, conteo (incluido el caso `0`, que no oculta la tarjeta), link, imagen opcional |
| `helpers/factories.ts` | **No es una suite**: `makeProduct`/`makeCartItem` para el conteo del carrito en `NavHeader`. Duplicadas a propósito de `components/ui/__tests__/helpers/` — un `__tests__/` no importa de una carpeta hermana (mismo criterio que el `apiError.ts` duplicado entre `checkout/` y `auth/`) |

## Por qué no hace falta `BrandProvider` en ningún test

`BrandContext` (en `components/providers/BrandProvider.tsx`) se crea con
`createContext<ResolvedBrand>(resolveBrand(null))` — es decir, su **default ya es** la marca de
fallback (`BRAND`, en `lib/domain/brand.ts`). Montar `Hero`/`NavHeader`/`Footer` sin envolverlos en
`<BrandProvider>` hace que `useBrand()` devuelva exactamente esos valores estáticos, sin queries de
por medio. Ningún test de esta carpeta mockea `lib/api/brand` por eso.

## Bug/gap real encontrado: `jest.setup.ts` no stubeaba `IntersectionObserver`

`Hero.tsx` y `Footer.tsx` usan `whileInView` de framer-motion, que en jsdom requiere
`IntersectionObserver` — inexistente ahí. Sin un stub, montar cualquiera de los dos revienta con
`ReferenceError: IntersectionObserver is not defined`. Se agregó un mock mínimo a
`jest.setup.ts` (mismo patrón que el `matchMedia` ya existente ahí para `useReducedMotion()`).
Documentado también en `components/ui/__tests__/README.md` porque el fix es compartido.

## Ramas que quedan fuera

- **`NavHeader.tsx` línea 26** — el `getServerSnapshot` de `useSyncExternalStore` (rama de
  hidratación SSR que da `false` en servidor). Un `render()` de RTL no pasa por una hidratación
  SSR→cliente real, así que ese branch específico no se dispara — mismo tipo de gap que la
  hidratación de `AdminGuard` (Fase 5), no perseguido ahí tampoco por la misma razón.
- **Las animaciones `whileInView`/`whileHover`/`reduceMotion` de `Hero`, `Footer` y
  `CategoryCard`** no se prueban a nivel de valores de motion (mismo criterio que el resto del
  proyecto, ver `components/ui/__tests__/README.md`) — el `IntersectionObserver` mockeado
  simplemente evita el crash, no dispara realmente el trigger de scroll.
