import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Las secciones son las dueñas de las queries y mutations del panel — necesitan
// un QueryClientProvider real, mismo patrón que el resto de `__tests__/` admin.
// `retry: false` evita que un mock de error se reintente y haga lento (o
// indeterminista) un test de un 4xx/5xx.
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/** `render` + `userEvent.setup()` dentro de un QueryClientProvider real. */
export function renderWithQueryClient(ui: ReactElement, options?: RenderOptions) {
  const queryClient = makeQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { user: userEvent.setup(), queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

/**
 * Fija el resultado de `matchMedia` para la consulta de escritorio de
 * `OrdersSection` (`min-width: 1280px`). El stub global de `jest.setup.ts`
 * siempre responde `matches: false` (móvil), así que el caso de escritorio —y
 * con él la página de 20— solo se puede ejercitar sobrescribiéndolo.
 */
export function setViewport(isDesktop: boolean) {
  // Asignación directa y no `defineProperty`: el stub de `jest.setup.ts` se
  // define `writable: true` pero **no** `configurable`, así que redefinirlo
  // lanza "Cannot redefine property".
  window.matchMedia = ((query: string) => ({
    matches: isDesktop,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
