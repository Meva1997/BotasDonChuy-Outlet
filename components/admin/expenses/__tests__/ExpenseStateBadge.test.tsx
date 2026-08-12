import { render, screen } from "@testing-library/react";
import ExpenseStateBadge from "../ExpenseStateBadge";
import { EXPENSE_STATE_LABEL, type ExpenseState } from "../expenseStatus";

// `expenseState()` —la precedencia que decide QUÉ estado le toca a un gasto— ya
// tiene specs puras en expenseStatus.test.ts. Aquí solo se prueba el badge: que
// pinte la etiqueta de cada estado y que los cinco tonos sean distintos entre sí.
//
// Lo segundo es una invariante real, no cosmética: el badge es el ÚNICO indicador
// de estado de la fila (no hay texto adicional que lo repita), así que dos estados
// que compartieran tono serían indistinguibles de un vistazo. El caso frágil está
// documentado en el fuente: "cobrado" y "terminado" son los dos pasado y comparten
// familia, pero un `once` ya pagado no es una baja.
const ALL_STATES: ExpenseState[] = [
  "activo",
  "programado",
  "cobrado",
  "terminado",
  "inactivo",
];

describe("ExpenseStateBadge", () => {
  it.each(ALL_STATES)("pinta la etiqueta en español del estado '%s'", (state) => {
    render(<ExpenseStateBadge state={state} />);
    expect(screen.getByText(EXPENSE_STATE_LABEL[state])).toBeInTheDocument();
  });

  it("da un tono distinto a cada uno de los cinco estados", () => {
    const classNames = ALL_STATES.map((state) => {
      const { unmount } = render(<ExpenseStateBadge state={state} />);
      const className = screen.getByText(EXPENSE_STATE_LABEL[state]).className;
      unmount();
      return className;
    });

    expect(new Set(classNames).size).toBe(ALL_STATES.length);
  });

  it("'cobrado' y 'terminado' no comparten tono pese a ser los dos pasado", () => {
    const { unmount } = render(<ExpenseStateBadge state="cobrado" />);
    const cobrado = screen.getByText("Cobrado").className;
    unmount();

    render(<ExpenseStateBadge state="terminado" />);
    const terminado = screen.getByText("Terminado").className;

    expect(cobrado).not.toBe(terminado);
  });
});
