import { render, screen } from "@testing-library/react";
import OrderTotals from "../OrderTotals";
import type { CartTotals } from "@/lib/domain/cart";

// Invariante de toda la app: `total = subtotal − savings − couponDiscount + shipping`.
// `shipping: null` (paso 0, antes de la dirección) tiene que verse como "todavía no
// se sabe", nunca como $0 ni como una fila oculta — un envío que no se nombra se lee
// como envío gratis, y el total mostrado ahí no es el que se va a cobrar.

function totals(overrides: Partial<CartTotals> = {}): CartTotals {
  return { subtotal: 1000, savings: 200, shipping: null, total: 800, ...overrides };
}

describe("OrderTotals", () => {
  it("con shipping null muestra 'Se calcula con tu dirección' y 'Total sin envío', nunca $0", () => {
    render(<OrderTotals totals={totals({ shipping: null })} />);
    expect(screen.getByText("Se calcula con tu dirección")).toBeInTheDocument();
    expect(screen.getByText("Total sin envío")).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });

  it("con shipping numérico muestra el monto y 'Total' (no 'Total sin envío')", () => {
    render(<OrderTotals totals={totals({ shipping: 150, total: 950 })} />);
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.queryByText("Total sin envío")).not.toBeInTheDocument();
  });

  it("shipping: 0 se muestra como monto (fila 'Envío'), no como 'se calcula'", () => {
    // Rama distinta de `null`: un envío gratuito real es un número, no la ausencia
    // de cotización. `shipping !== null` decide la rama, así que 0 debe tomar la
    // del monto.
    render(<OrderTotals totals={totals({ shipping: 0, total: 800 })} />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.queryByText("Se calcula con tu dirección")).not.toBeInTheDocument();
  });

  it("muestra el badge de ahorro solo cuando savings > 0", () => {
    const { rerender } = render(<OrderTotals totals={totals({ savings: 200 })} />);
    expect(screen.getByText("Ahorras $200.00")).toBeInTheDocument();

    rerender(<OrderTotals totals={totals({ savings: 0, subtotal: 800, total: 800 })} />);
    expect(screen.queryByText(/Ahorras/)).not.toBeInTheDocument();
  });

  it("no muestra la fila de cupón sin `discount`, ni con `discount.amount = 0`", () => {
    const { rerender } = render(<OrderTotals totals={totals()} />);
    expect(screen.queryByText(/Cupón/)).not.toBeInTheDocument();

    rerender(
      <OrderTotals totals={totals()} discount={{ code: "VERANO25", amount: 0 }} />
    );
    expect(screen.queryByText(/Cupón/)).not.toBeInTheDocument();
  });

  it("muestra la fila de cupón con el código cuando discount.amount > 0", () => {
    render(<OrderTotals totals={totals()} discount={{ code: "VERANO25", amount: 100 }} />);
    expect(screen.getByText("Cupón VERANO25")).toBeInTheDocument();
    expect(screen.getByText("−$100.00")).toBeInTheDocument();
  });

  it("muestra 'Cupón' sin código cuando discount.code es null", () => {
    render(<OrderTotals totals={totals()} discount={{ code: null, amount: 50 }} />);
    expect(screen.getByText("Cupón")).toBeInTheDocument();
  });

  it("no muestra el aviso de multi-caja con packageCount ausente o igual a 1", () => {
    const { rerender } = render(<OrderTotals totals={totals()} />);
    expect(screen.queryByText(/cajas/)).not.toBeInTheDocument();

    rerender(<OrderTotals totals={totals()} packageCount={1} />);
    expect(screen.queryByText(/cajas/)).not.toBeInTheDocument();
  });

  it("con packageCount > 1 y shipping cotizado, menciona que cada caja paga su guía", () => {
    render(<OrderTotals totals={totals({ shipping: 300, total: 1100 })} packageCount={3} />);
    expect(screen.getByText(/Tu pedido va en 3 cajas/)).toBeInTheDocument();
    expect(screen.getByText(/cada caja paga su propia guía/)).toBeInTheDocument();
  });

  it("con packageCount > 1 y shipping aún null, no promete el desglose por caja", () => {
    render(<OrderTotals totals={totals({ shipping: null })} packageCount={3} />);
    expect(screen.getByText(/Tu pedido va en 3 cajas/)).toBeInTheDocument();
    expect(screen.queryByText(/cada caja paga su propia guía/)).not.toBeInTheDocument();
  });
});
