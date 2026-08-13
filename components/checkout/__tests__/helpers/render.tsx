import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CheckoutProvider } from "../../CheckoutContext";

// Los componentes de checkout leen useCheckout() (CheckoutContext) y/o disparan
// queries/mutations de TanStack Query — a diferencia de import/, que no necesita
// providers porque todo entra por props. `retry: false` evita que un mock de error
// se reintente 3 veces y haga lento (o indeterminista) cada test de un 4xx.
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/** `render` + `userEvent.setup()` dentro de QueryClientProvider + CheckoutProvider. */
export function renderWithCheckout(ui: ReactElement, options?: RenderOptions) {
  const queryClient = makeQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <CheckoutProvider>{children}</CheckoutProvider>
    </QueryClientProvider>
  );
  return { user: userEvent.setup(), queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

/** Wrapper para `renderHook` de hooks que dependen de useCheckout() + TanStack Query. */
export function checkoutHookWrapper() {
  const queryClient = makeQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <CheckoutProvider>{children}</CheckoutProvider>
      </QueryClientProvider>
    );
  }
  return { Wrapper, queryClient };
}
