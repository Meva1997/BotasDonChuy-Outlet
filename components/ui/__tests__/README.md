# Tests de `components/ui/`

UI compartida por todo el storefront (Fase 10 del roadmap). Un archivo de test por módulo:

| Archivo | Cubre |
|---|---|
| `Cart.test.tsx` | El drawer del carrito: estado vacío, `size === 0` oculta la fila de talla, el botón `+` se deshabilita al llegar al stock real de la talla (`sizes.filter(s => s === item.size).length`), `−` hasta 0 elimina el artículo, totales (original/outlet/descuento), navegación a `/checkout` y `/outlet`, cierre por X/backdrop, que el clic en checkout nunca pinta "Cargando...", y el ajuste de estado en render que resetea `navigating` al reabrir |
| `ImageCarousel.test.tsx` | Las tres branches por conteo de imágenes (0 / 1 / 2+), flechas, puntos con `aria-current`, wrap-around en ambas direcciones, navegación por teclado solo cuando hay 2+ imágenes |
| `FormControls.test.tsx` | `TextField`/`SelectField`: asociación label↔input, rama de error (mensaje + `aria-invalid` + borde rojo), placeholder opcional de `SelectField`, forwarding de ref |
| `helpers/factories.ts` | **No es una suite**: `makeProduct`/`makeCartItem`, mismo criterio que `outlet/__tests__/helpers` |

## Qué ordena estas suites

`Cart.tsx` es lo único con lógica real (deriva el stock disponible por talla del propio array `sizes`, no de un campo separado); el resto es sobre todo presentacional, así que el criterio es exhaustividad de ramas más que riesgo de negocio.

## Bug/gap real encontrado: `jest.setup.ts` no stubeaba `IntersectionObserver`

Ningún test anterior había montado un componente con `whileInView` (framer-motion). `Hero.tsx`/`Footer.tsx` (home, misma fase) sí lo usan, y jsdom no implementa `IntersectionObserver` — cualquier intento de montarlos reventaba con `ReferenceError: IntersectionObserver is not defined`. Se agregó un stub mínimo a `jest.setup.ts`, mismo patrón que el `matchMedia` ya existente ahí (necesario para `useReducedMotion()`).

## Hallazgo real (no un bug que se arregló): el `navigating` de `Cart.tsx` nunca se ve

El botón "Proceder al checkout" hace `setNavigating(true)`, `closeCart()` y `router.push("/checkout")` en el mismo handler síncrono. Como las tres llamadas se agrupan en un solo render (batching de React), `isOpen` ya es `false` en el primer render posterior al clic — `AnimatePresence` congela el panel que sale con el **último árbol que sí se renderizó** (antes del clic, con `navigating: false`), así que el texto "Cargando..." y el spinner nunca llegan a pintarse; el botón que se ve saliendo dice "Proceder al checkout" hasta el final de la animación. Verificado con un test que hace clic y comprueba las dos cosas: que el botón conserva su nombre accesible y que "Cargando..." no está en el DOM. No se modificó `Cart.tsx`: decidir si el carrito debería quedarse abierto durante la navegación (para que el loading sí se vea) es una decisión de producto, no algo que se resuelva escribiendo tests.

El reset de `navigating` al reabrir (`if (isOpen) setNavigating(false)`) tiene su propio test, y **tiene que hacer el viaje completo** para valer algo: clic en checkout (deja el estado armado aunque no se pinte) → reabrir → aserción. La primera versión de este test montaba el carrito cerrado y solo lo abría, con `navigating` ya en `false` desde el montaje: borrar la línea del fuente dejaba la suite verde. Hoy esa mutación la hace fallar.

> Detalle de instrumentación: la rama `navigating ? "Cargando..." : "..."` (línea 311) **sí** aparece cubierta, y no contradice lo anterior. Al reabrir, el ajuste de estado en render corre durante un primer pase con `isOpen: true` y `navigating` todavía en `true`; React re-renderiza de inmediato y **descarta** ese árbol, pero el JSX ya se evaluó. Cubierta ≠ visible.

## Ramas que quedan fuera (branch % no llega a 100% en algunos archivos)

Mismo criterio que `orders/`/`products/__tests__/README.md`: se listan una por una, no se agrupan bajo un solo "no aplica".

- **`Cart.tsx` líneas 76-78 y `ImageCarousel.tsx` líneas 67/72** — el lado `reduceMotion: true` de los `? 0 : ...` que arman los valores de framer-motion. El stub global de `matchMedia` siempre devuelve `matches: false`, así que `useReducedMotion()` es siempre `false` en el entorno de test — mismo gap ya aceptado en `OrderDetailModal`/`ProductForm` (Fases 6-7). Son las únicas dos ramas que le faltan a `Cart.tsx` (branch 92.3%).
- **`ImageCarousel.tsx` línea 55** (`if (count === 0) return;` dentro de `paginate`) — código defensivo muerto: `paginate` solo se llama desde las flechas, que no se renderizan cuando `count === 0` (`hasMultiple` ya lo exige indirectamente vía `images.length > 1`).
