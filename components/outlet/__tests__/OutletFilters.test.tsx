import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OutletFilters, { type OutletFiltersProps } from "../OutletFilters";

// La pieza más intrincada fuera de checkout: URL como fuente de verdad, un
// borrador local con debounce de 1000ms, y la regla de que los inputs pintan el
// texto CRUDO de la URL (nunca el valor saneado) para no borrarle al comprador
// lo que está escribiendo. Ver el comentario largo en OutletFilters.tsx.

function baseProps(overrides: Partial<OutletFiltersProps> = {}) {
  return {
    showCategoria: true,
    showTalla: false,
    qText: "",
    precioMinText: "",
    precioMaxText: "",
    invertedPriceRange: false,
    availableSizes: [26, 27, 28],
    filtersActive: false,
    onCategoriaChange: jest.fn(),
    onTallaChange: jest.fn(),
    onOrdenChange: jest.fn(),
    onTextFiltersCommit: jest.fn(),
    onClearFilters: jest.fn(),
    ...overrides,
  };
}

/**
 * Los dos tests del debounce corren con timers falsos: esperar más de 1s reales por
 * cada uno solo alarga la suite. `advanceTimers` mantiene a user-event en sincronía
 * con el reloj falso (sin él, `user.type` se cuelga esperando su propio delay).
 */
function withFakeTimers() {
  jest.useFakeTimers();
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

afterEach(() => {
  jest.useRealTimers();
});

describe("OutletFilters", () => {
  it("pinta el texto crudo de la URL en los tres campos de texto", () => {
    render(
      <OutletFilters
        {...baseProps({ qText: "vaquera", precioMinText: "abc", precioMaxText: "900" })}
      />
    );

    expect(screen.getByLabelText("Buscar en el catálogo")).toHaveValue("vaquera");
    expect(screen.getByLabelText("Precio mínimo")).toHaveValue("abc");
    expect(screen.getByLabelText("Precio máximo")).toHaveValue("900");
  });

  it("commitea los tres campos de texto juntos tras el debounce de 1000ms", async () => {
    const onTextFiltersCommit = jest.fn();
    const user = withFakeTimers();
    render(<OutletFilters {...baseProps({ onTextFiltersCommit })} />);

    await user.type(screen.getByLabelText("Buscar en el catálogo"), "bota");

    expect(onTextFiltersCommit).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1050);
    });

    // Cuatro teclas, un solo commit: el `clearTimeout` del cleanup es lo que
    // agrupa. Y los tres campos viajan juntos aunque solo se haya tecleado uno.
    expect(onTextFiltersCommit).toHaveBeenCalledTimes(1);
    expect(onTextFiltersCommit).toHaveBeenCalledWith({
      q: "bota",
      precioMin: "",
      precioMax: "",
    });
  });

  it("no commitea al montar cuando el texto ya coincide con la URL", () => {
    const onTextFiltersCommit = jest.fn();
    jest.useFakeTimers();
    render(<OutletFilters {...baseProps({ qText: "bota", onTextFiltersCommit })} />);

    act(() => {
      jest.advanceTimersByTime(1050);
    });

    expect(onTextFiltersCommit).not.toHaveBeenCalled();
  });

  it("re-siembra el borrador cuando la URL cambia por fuera del teclado", () => {
    const { rerender } = render(<OutletFilters {...baseProps({ qText: "bota" })} />);

    expect(screen.getByLabelText("Buscar en el catálogo")).toHaveValue("bota");

    // Simula "atrás" del navegador o "Limpiar filtros": la prop cambia sin que
    // el comprador haya tecleado nada.
    rerender(<OutletFilters {...baseProps({ qText: "" })} />);

    expect(screen.getByLabelText("Buscar en el catálogo")).toHaveValue("");
  });

  it("oculta el select de categoría cuando showCategoria es false", () => {
    render(<OutletFilters {...baseProps({ showCategoria: false })} />);

    expect(screen.queryByLabelText("Categoría")).not.toBeInTheDocument();
  });

  it("oculta el select de talla cuando showTalla es false", () => {
    render(<OutletFilters {...baseProps({ showTalla: false })} />);

    expect(screen.queryByLabelText("Talla")).not.toBeInTheDocument();
  });

  it("muestra el select de talla con las tallas disponibles cuando showTalla es true", () => {
    render(
      <OutletFilters
        {...baseProps({ showTalla: true, availableSizes: [26, 27] })}
      />
    );

    const select = screen.getByLabelText("Talla") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(["", "26", "27"]);
  });

  it("llama a onCategoriaChange con el valor o null al volver a 'Todas'", async () => {
    const onCategoriaChange = jest.fn();
    const user = userEvent.setup();
    render(<OutletFilters {...baseProps({ onCategoriaChange })} />);

    await user.selectOptions(screen.getByLabelText("Categoría"), "bota");
    expect(onCategoriaChange).toHaveBeenLastCalledWith("bota");

    await user.selectOptions(screen.getByLabelText("Categoría"), "");
    expect(onCategoriaChange).toHaveBeenLastCalledWith(null);
  });

  it("llama a onTallaChange con el valor elegido, y con null al volver a 'Todas'", async () => {
    const onTallaChange = jest.fn();
    const user = userEvent.setup();
    render(
      <OutletFilters
        {...baseProps({ showTalla: true, availableSizes: [26, 27], onTallaChange })}
      />
    );

    await user.selectOptions(screen.getByLabelText("Talla"), "27");
    expect(onTallaChange).toHaveBeenLastCalledWith("27");

    await user.selectOptions(screen.getByLabelText("Talla"), "");
    expect(onTallaChange).toHaveBeenLastCalledWith(null);
  });

  it("llama a onOrdenChange con el valor elegido, y con null al volver al orden por defecto", async () => {
    const onOrdenChange = jest.fn();
    const user = userEvent.setup();
    render(<OutletFilters {...baseProps({ onOrdenChange })} />);

    await user.selectOptions(screen.getByLabelText("Ordenar por"), "precio_asc");
    expect(onOrdenChange).toHaveBeenLastCalledWith("precio_asc");

    await user.selectOptions(screen.getByLabelText("Ordenar por"), "");
    expect(onOrdenChange).toHaveBeenLastCalledWith(null);
  });

  it("muestra el aviso de rango invertido solo cuando invertedPriceRange es true", () => {
    const { rerender } = render(
      <OutletFilters {...baseProps({ invertedPriceRange: false })} />
    );
    expect(
      screen.queryByText(/precio mínimo es mayor que el máximo/)
    ).not.toBeInTheDocument();

    rerender(<OutletFilters {...baseProps({ invertedPriceRange: true })} />);
    expect(
      screen.getByText(/precio mínimo es mayor que el máximo/)
    ).toBeInTheDocument();
  });

  it("muestra el conteo en singular con un solo resultado", () => {
    render(<OutletFilters {...baseProps({ total: 1 })} />);
    expect(screen.getByText(/1 modelo/)).toBeInTheDocument();
    expect(screen.queryByText(/1 modelos/)).not.toBeInTheDocument();
  });

  it("muestra el conteo en plural con varios o cero resultados", () => {
    const { rerender } = render(<OutletFilters {...baseProps({ total: 5 })} />);
    expect(screen.getByText(/5 modelos/)).toBeInTheDocument();

    rerender(<OutletFilters {...baseProps({ total: 0 })} />);
    expect(screen.getByText(/0 modelos/)).toBeInTheDocument();
  });

  it("el botón de limpiar filtros solo aparece cuando filtersActive es true", () => {
    const { rerender } = render(
      <OutletFilters {...baseProps({ filtersActive: false })} />
    );
    expect(
      screen.queryByRole("button", { name: /Limpiar filtros/ })
    ).not.toBeInTheDocument();

    rerender(<OutletFilters {...baseProps({ filtersActive: true })} />);
    expect(
      screen.getByRole("button", { name: /Limpiar filtros/ })
    ).toBeInTheDocument();
  });

  it("llama a onClearFilters al hacer clic en 'Limpiar filtros'", async () => {
    const onClearFilters = jest.fn();
    const user = userEvent.setup();
    render(<OutletFilters {...baseProps({ filtersActive: true, onClearFilters })} />);

    await user.click(screen.getByRole("button", { name: /Limpiar filtros/ }));

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
