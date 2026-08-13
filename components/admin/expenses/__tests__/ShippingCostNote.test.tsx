import { render, screen } from "@testing-library/react";
import ShippingCostNote from "../ShippingCostNote";
import { makeDerivedShippingCost } from "./helpers/factories";

// shippingWindowLabel ya tiene specs propias en expenseStatus.test.ts — aquí solo
// se verifica que el componente lo use y que la línea derivada se muestre siempre
// como "no editable, no sumado a totales", que es la invariante que existe para
// que el dueño nunca la capture dos veces como gasto.
describe("ShippingCostNote", () => {
  it("muestra el monto y las dos advertencias de 'no lo sumes/captures dos veces'", () => {
    render(<ShippingCostNote shippingCost={makeDerivedShippingCost({ amount: 640 })} />);

    expect(screen.getByText(/Envíos \(guías\):/)).toHaveTextContent(
      "Envíos (guías): $640.00 — ya restado en la ganancia bruta del panel."
    );
    expect(screen.getByText("No lo captures como gasto: se contaría dos veces.")).toBeInTheDocument();
  });

  it("pluraliza 'pedidos' cuando hay más de uno", () => {
    render(<ShippingCostNote shippingCost={makeDerivedShippingCost({ orders: 4 })} />);
    expect(screen.getByText(/4 pedidos$/)).toBeInTheDocument();
  });

  it("no pluraliza con un solo pedido", () => {
    render(<ShippingCostNote shippingCost={makeDerivedShippingCost({ orders: 1 })} />);
    expect(screen.getByText(/1 pedido$/)).toBeInTheDocument();
  });

  it("no tiene controles: es una línea derivada, no editable", () => {
    render(<ShippingCostNote shippingCost={makeDerivedShippingCost()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
