import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CodeInput from "../CodeInput";

// Componente controlado (value/onChange) — value es SIEMPRE contiguo, así que
// escribir/pegar/borrar debe reflejarse tanto en el string reportado a onChange
// como en el foco, sin dejar "huecos". Se envuelve en un wrapper con estado
// propio para ejercitar el ciclo completo tal como lo usa ResetCodeForm.

function Controlled({ onComplete }: { onComplete?: (value: string) => void }) {
  const [value, setValue] = useState("");
  return <CodeInput value={value} onChange={setValue} onComplete={onComplete} />;
}

function digit(n: number) {
  return screen.getByLabelText(`Dígito ${n} de 5`) as HTMLInputElement;
}

describe("escritura", () => {
  it("cada dígito avanza el foco a la siguiente casilla vacía", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(digit(1));
    await user.keyboard("1");
    expect(digit(2)).toHaveFocus();
    await user.keyboard("2");
    expect(digit(3)).toHaveFocus();

    expect(digit(1).value).toBe("1");
    expect(digit(2).value).toBe("2");
  });

  it("caracteres no numéricos se ignoran", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(digit(1));
    await user.keyboard("a");

    expect(digit(1).value).toBe("");
    expect(digit(1)).toHaveFocus();
  });

  it("al llenar las 5 casillas dispara onComplete con el código completo", async () => {
    const onComplete = jest.fn();
    const user = userEvent.setup();
    render(<Controlled onComplete={onComplete} />);

    await user.click(digit(1));
    await user.keyboard("13579");

    expect(onComplete).toHaveBeenCalledWith("13579");
    expect(digit(5).value).toBe("9");
  });
});

describe("backspace", () => {
  it("con dígito presente en la casilla, solo lo borra (no retrocede el foco)", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(digit(1));
    await user.keyboard("12");
    // foco está en la casilla 3 (vacía) tras escribir "1" y "2"
    await user.click(digit(2));
    await user.keyboard("{Backspace}");

    expect(digit(2).value).toBe("");
    expect(digit(2)).toHaveFocus();
    expect(digit(1).value).toBe("1");
  });

  it("con la casilla ya vacía, retrocede y borra el dígito anterior", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(digit(1));
    await user.keyboard("1");
    // foco avanzó a la casilla 2, vacía
    await user.keyboard("{Backspace}");

    expect(digit(1).value).toBe("");
    expect(digit(1)).toHaveFocus();
  });
});

describe("flechas", () => {
  it("ArrowLeft/ArrowRight mueven el foco sin modificar el valor", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(digit(1));
    await user.keyboard("123");
    // foco en casilla 4
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(digit(2)).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(digit(3)).toHaveFocus();
    expect(digit(1).value + digit(2).value + digit(3).value).toBe("123");
  });
});

describe("pegar", () => {
  it("pegar un código completo llena las 5 casillas y dispara onComplete", () => {
    const onComplete = jest.fn();
    render(<Controlled onComplete={onComplete} />);

    fireEvent.paste(digit(1), { clipboardData: { getData: () => "97531" } });

    expect(digit(1).value).toBe("9");
    expect(digit(5).value).toBe("1");
    expect(onComplete).toHaveBeenCalledWith("97531");
  });

  it("pegar código con caracteres no numéricos los descarta", () => {
    render(<Controlled />);

    fireEvent.paste(digit(1), { clipboardData: { getData: () => "1a2b3" } });

    expect(digit(1).value).toBe("1");
    expect(digit(2).value).toBe("2");
    expect(digit(3).value).toBe("3");
  });

  it("pegar algo sin ningún dígito no modifica el valor", () => {
    render(<Controlled />);

    fireEvent.paste(digit(1), { clipboardData: { getData: () => "abcde" } });

    expect(digit(1).value).toBe("");
  });
});

describe("foco en una casilla-hueco", () => {
  it("clic más allá del último dígito llenado redirige a la primera casilla libre", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(digit(1));
    await user.keyboard("12");
    // value = "12"; la casilla 5 está más allá de la primera libre (índice 2).
    await user.click(digit(5));

    expect(digit(3)).toHaveFocus();
  });
});

describe("estados", () => {
  it("disabled deshabilita las 5 casillas", () => {
    render(<CodeInput value="" onChange={() => {}} disabled />);
    for (let i = 1; i <= 5; i++) {
      expect(digit(i)).toBeDisabled();
    }
  });

  it("error marca aria-invalid en las 5 casillas", () => {
    render(<CodeInput value="" onChange={() => {}} error />);
    for (let i = 1; i <= 5; i++) {
      expect(digit(i)).toHaveAttribute("aria-invalid", "true");
    }
  });

  it("sin error, aria-invalid es false", () => {
    render(<CodeInput value="" onChange={() => {}} />);
    expect(digit(1)).toHaveAttribute("aria-invalid", "false");
  });

  it("autoFocus solo se aplica a la primera casilla", () => {
    render(<CodeInput value="" onChange={() => {}} autoFocus />);
    expect(digit(1)).toHaveFocus();
    expect(digit(2)).not.toHaveFocus();
  });

  it("sin autoFocus, ninguna casilla recibe el foco al montar", () => {
    render(<CodeInput value="" onChange={() => {}} />);
    expect(digit(1)).not.toHaveFocus();
  });
});
