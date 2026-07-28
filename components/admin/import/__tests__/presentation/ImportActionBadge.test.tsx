import { render, screen } from "@testing-library/react";
import { ImportActionSchema } from "@/lib/api/adminProductImport";
import {
  AppliedBadge,
  DependencyBadge,
  EditedBadge,
  ImportActionBadge,
  ImportResultBadge,
  ReactivatedBadge,
} from "../../ImportActionBadge";
import { ACTION_META } from "../../labels";

// Regla de la pantalla: todo badge lleva TEXTO, no solo color (mismo criterio que
// components/admin/orders/StatusBadges.tsx). Es lo que se prueba aquí, junto con los dos casos
// donde el badge cambia de significado: una fila editada y un estado que no conocemos.

describe("ImportActionBadge", () => {
  it("pinta la etiqueta de cada acción del contrato", () => {
    for (const action of ImportActionSchema.options) {
      const { unmount } = render(<ImportActionBadge action={action} />);
      expect(screen.getByText(ACTION_META[action].label)).toBeInTheDocument();
      unmount();
    }
  });

  it("describe la acción en el title, para quien no distingue los colores", () => {
    render(<ImportActionBadge action="update" />);
    expect(screen.getByTitle(ACTION_META.update.description)).toBeInTheDocument();
  });

  it("marca como «(original)» la acción de una fila editada", () => {
    // Tras editar, la acción es la que traía el ARCHIVO y puede haber dejado de ser cierta:
    // leerla como el veredicto vigente sería creer un diff que ya no aplica.
    render(<ImportActionBadge action="update" muted />);
    expect(screen.getByText(/\(original\)/)).toBeInTheDocument();
    expect(
      screen.getByTitle(`${ACTION_META.update.description} (según el archivo, antes de tu edición)`)
    ).toBeInTheDocument();
  });
});

describe("ImportResultBadge", () => {
  it("traduce los estados conocidos", () => {
    render(<ImportResultBadge status="created" />);
    expect(screen.getByText("Creado")).toBeInTheDocument();
  });

  it("muestra tal cual un estado que no conocemos, en vez de dejar la celda muda", () => {
    render(<ImportResultBadge status="algo_nuevo" />);
    expect(screen.getByText("algo_nuevo")).toBeInTheDocument();
  });
});

describe("badges de estado de la fila", () => {
  it("«Editada» avisa que el diff ya no es de fiar", () => {
    render(<EditedBadge />);
    expect(screen.getByText("Editada")).toBeInTheDocument();
  });

  it("«Se reactivará» hace visible un efecto que no aparece en changes", () => {
    render(<ReactivatedBadge />);
    expect(screen.getByText("Se reactivará")).toBeInTheDocument();
    expect(screen.getByTitle(/volverá al catálogo público/)).toBeInTheDocument();
  });

  it("«Ya aplicada» explica el candado: reenviarla sumaría el stock otra vez", () => {
    render(<AppliedBadge />);
    expect(screen.getByText("Ya aplicada")).toBeInTheDocument();
    expect(screen.getByTitle(/el stock se sumaría otra vez/)).toBeInTheDocument();
  });
});

describe("DependencyBadge", () => {
  it("nombra la fila proveedora por su folio del Excel", () => {
    render(<DependencyBadge providerRow={7} satisfied />);
    expect(screen.getByText("Depende de la fila 7")).toBeInTheDocument();
    expect(screen.getByTitle(/la crea una fila anterior|lo crea una fila anterior/)).toBeInTheDocument();
  });

  it("distingue el caso de que ninguna fila cree el producto", () => {
    render(<DependencyBadge providerRow={null} satisfied={false} />);
    expect(screen.getByText("Sin fila que lo cree")).toBeInTheDocument();
    expect(screen.getByTitle("La fila que crea este producto no se va a aplicar")).toBeInTheDocument();
  });
});
