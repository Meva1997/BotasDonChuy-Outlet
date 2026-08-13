# Tests de Admin: Secciones (contenedores)

Las secciones son las **dueñas del estado y de las escrituras**: los subcomponentes reciben
`onSubmit`/`onToggleActive`/`onPageChange` como props y no llaman a nada. Por eso estas suites no
repiten lo que ya prueban `orders/`, `coupons/`, `expenses/`, `data/` y `reports/` — verifican lo
que **solo la sección decide**.

| Archivo | Cubre |
|---|---|
| `OrdersSection.test.tsx` | `perPage` 20/5 según viewport; el toast de Sileo y sus cuatro supresiones; el filtro por día server-side; el error con y sin datos previos |
| `CouponsSection.test.tsx` | El `code` solo en el alta; "Cancelar" como `PUT { active:false }`; el `deactivated: true` del DELETE; `couponWriteErrorMessage`; que solo se invalide su propia caché |
| `ExpensesSection.test.tsx` | Lo mismo **más** la invalidación de `dashboardKeys`; que editar nunca reprecie; los dos formularios excluyentes; la pestaña Historial con su query propia |
| `ReportsSection.test.tsx` | El mes por defecto (el último **completo**), su reconciliación contra datos que cambian, y el selector que se esconde en Reposición |
| `DataSection.test.tsx` | Que el rótulo del periodo y el índice de `kpisByPeriod`/`profitKpisByPeriod` se muevan juntos |
| `ConfigSection.test.tsx` | Que "Cerrar Sesión" limpie el store **y** navegue |
| `helpers/` | **No son suites**: `factories`, `render` (QueryClientProvider + `setViewport`), `apiError` |

Fuera de alcance de esta fase, sin specs: `BrandSection`, `ProductSection` e `ImportSection` (los
subcomponentes de `import/` sí están cubiertos desde la Fase 13).

## Qué ordena estas suites

### El toast de pedidos (`OrdersSection`)

La regla es "avisa solo de lo que el dueño **no** hizo", y tiene cuatro formas de romperse. Cada una
tiene su caso, y los cuatro son aserciones de **ausencia**:

1. **Primera carga** — no hay foto previa contra la cual comparar.
2. **Refresh manual** — el dueño ya está mirando la tabla.
3. **Acción propia desde el modal** — cancelar/reembolsar/avanzar estado tocan campos que están en
   la firma; sin la marca, el panel le avisaría al dueño de su propio clic unos segundos después de
   darlo. El caso cancela de verdad desde el modal, no simula el callback.
4. **Vista nueva** (otra página, otro día) — no hereda la foto de la vista anterior.

El "refetch automático" se simula con `queryClient.refetchQueries()`, que es el mismo camino que
toma el `refetchInterval` de 30 minutos: el efecto no distingue el intervalo de cualquier refetch
que no venga del botón. **Toda aserción de ausencia lleva un `await new Promise(r => setTimeout(r, 0))`
dentro del mismo `act`** — TanStack Query notifica a sus suscriptores en un macrotask, y sin ese
flush la prueba se evalúa contra el estado viejo y pasa con y sin el guard (ver CLAUDE.md).

`setViewport(isDesktop)` sobrescribe `matchMedia` por asignación directa y no con `defineProperty`:
el stub de `jest.setup.ts` se define `writable: true` pero **no** `configurable`, así que
redefinirlo lanza "Cannot redefine property".

### Bug real encontrado y corregido durante esta fase

El toast se apagaba solo. `isManualRefreshRef` se limpia dentro del efecto que compara firmas, y ese
efecto dependía de `[data, …]`; pero TanStack Query **comparte estructura**: si un refetch devuelve
exactamente lo mismo, `data` conserva la misma referencia y el efecto no vuelve a correr. Un refresh
manual que no encontraba nada nuevo —el caso más común, porque el dueño refresca justo para ver si
cambió algo— dejaba la marca armada para siempre, y el **siguiente** refetch automático se comía su
aviso en silencio.

Corregido agregando `dataUpdatedAt` a las dependencias, que sí cambia en cada fetch completado.
Verificado rompiéndolo de nuevo: sin él, el caso "después de un refresh manual, el siguiente refetch
automático vuelve a avisar" falla. Es el tercer bug de esta familia en el proyecto (`CodeInput`
Fase 5, `ProductForm` Fase 7, `ExpenseForm` Fase 8): estado que sobrevive donde no debería, o que no
se actualiza donde sí.

### Cupones vs. gastos: la diferencia es la invalidación

Las dos secciones son casi gemelas —lista, formulario, cancelar/reactivar, borrado con
soft-deactivate— y por eso el caso que las separa es explícito en las dos:

- **Un cupón no toca stock ni pedidos**: `CouponsSection` invalida **solo** `adminCouponKeys.all`, y
  el caso lo afirma con `toHaveBeenCalledTimes(1)`.
- **Un gasto sí mueve el dashboard**: `ExpensesSection` invalida además `dashboardKeys`, porque el
  KPI `GASTOS` sale del mismo servicio. Sin eso la pestaña Datos seguiría mostrando el número viejo
  — la incoherencia que la Fase 20 vino a cerrar.

En ambas, el aviso del borrado se redacta sobre lo que el **backend hizo**, no sobre lo que la UI
pidió: `deactivated: true` significa que el registro sigue vivo, y decir "eliminado" sobre algo que
sigue en la lista parecería un error de la app. Los dos casos afirman también la **ausencia** de la
palabra "eliminado".

`ExpensesSection` prueba además que **editar nunca reprecia**: el formulario de edición ni siquiera
monta el campo de monto, y el payload del `PUT` no lleva `amount` ni `amountEffectiveFrom`. Si los
llevara, corregir una falta de ortografía en el concepto agregaría una versión de precio.

### Detalles del entorno

- `CouponForm` monta su propia query del catálogo para el rango de precios; el mock de
  `getAdminProducts` devuelve un **array plano** (no una página), o revienta en `.filter`.
- Los payloads se comparan con `mock.calls[0][0]` y no con `toHaveBeenCalledWith`: TanStack Query 5
  le pasa a `mutationFn` su propio contexto como segundo argumento.
- Los botones de acción de las tablas se buscan por `aria-label` ("Cancelar cupón", "Dar de baja el
  gasto"), no por el `title`.
- En `DataSection`, el selector de periodo se acota por su `role="group"` con nombre ("Periodo de
  las métricas"): `RevenueChart` pinta tres botones con las mismas etiquetas para su propio eje, y
  los dos son independientes a propósito. El nombre accesible se le agregó al fuente durante esta
  fase — sin él, el grupo era anónimo también para un lector de pantalla, y la única forma de
  acotarlo desde el test era una clase de Tailwind (presentación, no contrato).
- En `ReportsSection`, las fixtures traen un producto con costo para que la **utilidad** no coincida
  con los **ingresos**: con `byProduct` vacío las dos tarjetas pintan el mismo número y una aserción
  de texto suelto no distinguiría qué mes se está mostrando (la misma trampa de ambigüedad
  documentada en `expenses/__tests__/README.md`).

## Ramas aceptadas sin cubrir (gap documentado, no un olvido)

Las tres son código defensivo inalcanzable, mismo criterio que los gaps ya aceptados en las fases
anteriores:

- **`CouponsSection.tsx:102-104` y `ExpensesSection.tsx:151-153`** — el `?? null` de
  `toggleMutation.variables?.id` / `deleteMutation.variables?.id`. Ese `variables` solo se lee
  cuando la mutation está `isPending`, y en ese momento siempre existe: TanStack Query lo fija antes
  de disparar la petición. Los dos ternarios **sí** están cubiertos (hay casos con la baja y con el
  borrado en vuelo); lo que no se puede provocar es el `undefined`.
- **`ReportsSection.tsx:69`** — el `?? ""` de `(completeMonths.at(-1) ?? reports.at(-1))?.key`. El
  bloque entero vive dentro de un `reports.length > 0`, así que `reports.at(-1)` nunca es
  `undefined`. Las dos primeras ramas del `??` sí están cubiertas (con y sin meses completos).
