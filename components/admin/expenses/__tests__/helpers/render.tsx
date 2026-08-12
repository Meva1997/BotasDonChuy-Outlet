import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ExpenseHistory tiene su propia query (getExpenseHistory) vía TanStack Query —
// necesita un QueryClientProvider real, mismo patrón que coupons/orders/products.
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
