# Tests de `lib/api`

La capa que habla con el backend: una instancia axios y un fetcher por recurso. Un archivo de test
por módulo, mismo nombre que el módulo que prueba:

| Archivo | Cubre |
|---|---|
| `client.test.ts` | Los dos interceptores: a qué petición se le adjunta el Bearer y qué 401 cierra la sesión. **Corre en entorno `node`** (ver abajo) |
| `auth.test.ts` | `login`/`forgotPassword`/`verifyResetCode`/`resetPassword`/`getMe` + `authKeys` |
| `account.test.ts` | `updateOwnAccount` y su `skipAuthRedirect` |
| `adminUsers.test.ts` | CRUD de administradores + `acceptWrite` |
| `brand.test.ts` | Lectura pública (`skipAuth`) vs. escritura protegida |
| `products.test.ts` | Catálogo público: filtros como query params, `getProductById` → `null` en 404 |
| `shipping.test.ts` | Cotización viva vs. tarifa plana de respaldo; `packageCount` requerido |
| `coupons.test.ts` | `validateCoupon`, `isCouponRejection`, `validateCouponErrorMessage` |
| `orders.test.ts` | `buildOrderPayload`, `createOrder` (idempotencia), `lookupOrder` + su mapa de errores |
| `adminOrders.test.ts` | Listado paginado con pestañas, cancelar, avanzar estado, reintentar guía, rotar token |
| `adminProducts.test.ts` | CRUD + galería de imágenes (multipart) |
| `adminCoupons.test.ts` | CRUD + `couponWriteErrorMessage` |
| `adminExpenses.test.ts` | Lista/resumen/historial + el `PUT` que versiona el monto |
| `adminProductImport.test.ts` | Preview estricto vs. commit tolerante + los dos mapas de errores |
| `dashboard.test.ts` / `reports.test.ts` | Lecturas de una sola llamada; el schema es todo lo que hay que probar |
| `helpers/` | **No son suites**: `mockApi` (el doble de transporte), `factories` (fixtures + `omit`), `apiError` |

## Cómo se mockea: se reemplaza el `adapter`, no el módulo

`helpers/mockApi.ts` sustituye `api.defaults.adapter` —la última capa, la que de verdad hablaría
con la red— en vez de mockear `lib/api/client.ts` con `jest.mock`. La diferencia importa: así los
interceptores corren **de verdad** en cada suite, y las aserciones se hacen sobre el request que
realmente saldría (URL, params ya resueltos por axios, cabeceras ya puestas por el interceptor,
banderas `skipAuth`/`skipAuthRedirect`). Mockear el módulo saltaría los interceptores por completo
y dejaría sin probar la única lógica no trivial de toda la capa.

El doble falla ruidosamente ante una petición sin respuesta encolada, en vez de dejar la promesa
colgada: una llamada de más se ve como un error explicado y no como un timeout sin causa.

## Por qué `client.test.ts` corre en `node` y no en `jsdom`

Las dos ramas del interceptor de respuesta dependen de `window.location`, y el `Location` de jsdom
26 es **no-configurable y de solo lectura**: no se puede `defineProperty` sobre `window.location`,
ni espiar `location.assign`, ni mover `pathname`. Con jsdom, la aserción que de verdad importa
—*¿a dónde se mandó al usuario?*— sería imposible, y el `assign` real solo escribiría un
"Not implemented: navigation" en la consola.

En `node` no hay `window`, así que la suite fabrica uno mínimo con exactamente lo que `client.ts`
lee (`location.pathname` y `location.assign`). De paso quedan cubiertas las ramas de **SSR**, donde
el guard `typeof window !== "undefined"` es lo que evita reventar en el servidor — inalcanzables
desde jsdom, donde `window` siempre existe.

Efecto secundario del entorno: sin `localStorage`, el middleware `persist` de `authStore` avisa en
cada `set()`. La suite filtra **ese** mensaje concreto y deja pasar cualquier otro, para no
enmascarar avisos reales.

Las demás suites corren en `jsdom` (el default) y **evitan provocar un 401 sin
`skipAuth`/`skipAuthRedirect`**: ahí sí dispararía el `location.assign` real y ensuciaría la salida
con el "Not implemented" de jsdom. El 401 y su cierre de sesión ya están cubiertos donde
corresponde, en `client.test.ts`.

## Qué ordena estas suites

Lo que se prueba no es "que la función llame a axios", sino las tres decisiones que esta capa toma
y que en producción se ven como bugs difíciles de rastrear hasta aquí:

**1 · Qué viaja y qué se omite.** Una clave presente con `""` o `null` **no** es lo mismo que una
clave ausente, y el backend responde distinto a cada una. Por eso hay un caso por cada omisión
deliberada: `couponCode` fuera cuando no hay cupón (un `""` sería 400), `quotationId`/`rateId`
ambos o ninguno (el both-or-neither de `createOrderSchema.refine`), los campos de guía omitidos en
vez de vacíos (una clave ausente significa "no toques ese campo", que es lo que permite avanzar el
estado sin borrar una guía ya guardada), `estado` ausente en la pestaña "Todos", `force` solo
cuando es `true` (es la única forma de generar una segunda guía, y cada guía se cobra), y
`sizes` vs. `stockQuantity` nunca juntos.

**2 · `parse` estricto vs. `safeParse` tolerante.** No es estilo: depende de si la petición ya
escribió. Una **lectura** usa `.parse()` y lanza —reintentarla es gratis, y una forma inesperada
significa que no podemos pintar la pantalla con honestidad—; cada lectura tiene su caso de "LANZA
si falta X". Una **escritura** que devolvió 2xx ya surtió efecto, así que usa `safeParse`, avisa en
consola y devuelve el dato crudo: lanzar ahí convertiría un éxito en error e invitaría a un
reintento que crearía un segundo pedido, un segundo producto o —el peor— **duplicaría el stock**
de un restock, que suma y no tiene deshacer desde la app. Cada `acceptWrite` tiene su caso, y se
afirma el `console.warn` exacto para que no baste con "no lanzó".

`createOrder` es la excepción de la excepción: usa `safeParse` pero **lanza** una clase propia
(`OrderResponseParseError`) en vez de devolver el dato crudo, porque la UI necesita distinguir
"tu pedido se creó pero no pudimos leerlo" de un fallo normal que sí invita a reintentar.
También lee `replayed` de la **cabecera** `Idempotency-Replayed`, nunca del cuerpo: el reenvío
idempotente es byte a byte idéntico al original, así que el cuerpo no puede delatarlo.

**3 · Los mapas de error.** Cinco funciones (`validateCouponErrorMessage`,
`lookupOrderErrorMessage`, `couponWriteErrorMessage`, `expenseWriteErrorMessage`,
`importPreviewErrorMessage`/`importCommitErrorMessage`) traducen un `AxiosError` en copia. Todas
comparten la misma regla —**preferir siempre el `message` del backend**, que ya viene en español y
es más específico que cualquier genérico— y todas tienen la misma trampa de cobertura: el reporte
no distingue "se leyó el mensaje del backend" de "cayó al respaldo". Por eso cada status
contemplado se prueba **dos veces**, con mensaje y sin él, más el caso sin `response` (la petición
nunca llegó) y el caso de algo que ni siquiera es un `AxiosError`.

La única que se aparta de la regla es la rama `>= 500` de `importPreviewErrorMessage`: ahí el
backend manda texto de infraestructura que no le dice nada al dueño, y la copia propia gana.

## Fixtures

`helpers/factories.ts` es deliberadamente una **copia** de las de `components/**/__tests__/helpers/`,
no un import: un `__tests__/` no importa de otro (misma regla que el `apiError.ts` duplicado entre
`checkout/` y `auth/`). Aquí los defaults tienen además un papel propio — cada uno representa "el
cuerpo que el backend manda hoy y que el schema debe aceptar", y las suites deforman ese cuerpo
con `omit(...)` para disparar la rama de parse que toca.

`omit()` existe en vez del `const { campo: _x, ...resto } = …` habitual porque ese patrón deja una
variable sin usar en cada suite (21 avisos de ESLint en la primera versión de estos tests), y
porque `omit(x, "total")` dice en la propia llamada qué es lo que falta.

## Ramas aceptadas sin cubrir (gap documentado, no un olvido)

- **`adminProductImport.ts:219`** — el `if (!axios.isAxiosError(error)) return undefined` de
  `backendMessage()`. La función es privada y sus dos llamadores ya están dentro de un
  `if (axios.isAxiosError(error))`, así que esa rama es inalcanzable desde la API pública del
  módulo. Es una guarda defensiva por si algún día se llama desde otro lado; exportarla solo para
  cubrirla ampliaría la superficie del módulo a cambio de nada.
- **`helpers/mockApi.ts`** — el propio doble de transporte no está al 100 % (el `catch` de un
  cuerpo no-JSON y el throw de "petición sin respuesta encolada" solo corren cuando una suite se
  escribe mal). Mismo criterio que el resto de `helpers/` del repo: la cobertura de un helper de
  pruebas no es una señal útil.
