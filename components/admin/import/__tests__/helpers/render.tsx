import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Helpers de montaje comunes a las suites de componentes.
//
// Ninguno de los componentes de `import/` necesita providers (no leen contexto ni queries: todo
// entra por props, que es lo que los hace testeables sin mocks). Lo único que hace falta es
// (a) emparejar cada render con su `userEvent`, y (b) darle a los componentes que devuelven
// `<tr>` un ancestro de tabla válido.

/** `render` + `userEvent.setup()` — el par que necesita casi cualquier test de interacción. */
export function renderWithUser(ui: ReactElement, options?: RenderOptions) {
  return { user: userEvent.setup(), ...render(ui, options) };
}

/**
 * Monta un componente que renderiza `<tr>` (ImportRow) dentro de `<table><tbody>`.
 *
 * Sin esto, jsdom saca las filas del árbol al reparar el HTML inválido y las consultas fallan
 * con un mensaje que no dice nada del problema real.
 */
export function renderRowInTable(ui: ReactElement) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <table>
      <tbody>{children}</tbody>
    </table>
  );
  return { user: userEvent.setup(), ...render(ui, { wrapper: Wrapper }) };
}
