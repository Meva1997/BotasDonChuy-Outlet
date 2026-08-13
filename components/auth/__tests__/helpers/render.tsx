import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// LoginForm/ForgotPasswordForm/AdminGuard usan useMutation/useQuery de TanStack
// Query — necesitan un QueryClientProvider real igual que checkout. `retry: false`
// evita que un mock de error se reintente y haga lento (o indeterminista) un test.
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
