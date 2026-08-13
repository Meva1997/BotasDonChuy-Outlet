import { screen, fireEvent } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { forgotPassword, verifyResetCode, resetPassword } from "@/lib/api/auth";
import ForgotPasswordForm from "../ForgotPasswordForm";
import NewPasswordForm from "../NewPasswordForm";
import { apiError } from "./helpers/apiError";
import { renderWithQueryClient } from "./helpers/render";

// Wizard de 3 pasos (Fase 10) con estado 100% local — un refresh reinicia en
// "email". Cada paso es un componente separado (ResetCodeForm, NewPasswordForm)
// pero se prueban aquí como un flujo integrado porque ninguno tiene sentido
// aislado: el "código" no existe sin el email del paso previo, y la "nueva
// contraseña" no existe sin un código ya verificado.

jest.mock("../../../lib/api/auth", () => ({
  ...jest.requireActual("../../../lib/api/auth"),
  forgotPassword: jest.fn(),
  verifyResetCode: jest.fn(),
  resetPassword: jest.fn(),
}));

const forgotPasswordMock = forgotPassword as jest.Mock;
const verifyResetCodeMock = verifyResetCode as jest.Mock;
const resetPasswordMock = resetPassword as jest.Mock;
const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const EMAIL = "dueno@botasdonchuy.com";

beforeEach(() => {
  jest.clearAllMocks();
});

async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  for (let i = 0; i < code.length; i++) {
    await user.type(screen.getByLabelText(`Dígito ${i + 1} de 5`), code[i]);
  }
}

async function goToCodeStep(user: ReturnType<typeof userEvent.setup>) {
  forgotPasswordMock.mockResolvedValueOnce(undefined);
  await user.type(screen.getByLabelText("Correo electrónico"), EMAIL);
  await user.click(screen.getByRole("button", { name: "Enviar código" }));
  await screen.findByLabelText("Dígito 1 de 5");
  expect(screen.getByText(EMAIL)).toBeInTheDocument();
}

async function goToPasswordStep(user: ReturnType<typeof userEvent.setup>) {
  await goToCodeStep(user);
  verifyResetCodeMock.mockResolvedValueOnce(undefined);
  await typeCode(user, "13579");
  await user.click(screen.getByRole("button", { name: "Verificar código" }));
  await screen.findByLabelText("Nueva contraseña");
  expect(screen.getByText(EMAIL)).toBeInTheDocument();
}

describe("paso 1 — email", () => {
  it("al enviar con éxito, avanza al paso de código", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToCodeStep(user);

    expect(forgotPasswordMock.mock.calls[0][0]).toEqual({ email: EMAIL });
    expect(screen.getByLabelText("Dígito 1 de 5")).toBeInTheDocument();
  });

  it("429 → mensaje de rate-limit, no avanza", async () => {
    forgotPasswordMock.mockRejectedValueOnce(apiError(429));
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Correo electrónico"), EMAIL);
    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
    );
    expect(screen.queryByLabelText("Dígito 1 de 5")).not.toBeInTheDocument();
  });

  it("error genérico (red/500) → copia genérica", async () => {
    forgotPasswordMock.mockRejectedValueOnce(apiError(500));
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Correo electrónico"), EMAIL);
    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos enviar el correo. Inténtalo de nuevo."
    );
  });

  it("correo con formato inválido muestra el error del campo, sin llamar al backend", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Correo electrónico"), "no-es-un-correo");
    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(
      await screen.findByText("Ingresa un correo electrónico válido")
    ).toBeInTheDocument();
    expect(forgotPasswordMock).not.toHaveBeenCalled();
  });

  it("mientras la mutation está pendiente, el botón muestra 'Enviando…' y se deshabilita", async () => {
    let resolve: () => void = () => {};
    forgotPasswordMock.mockReturnValueOnce(
      new Promise<void>((res) => {
        resolve = res;
      })
    );
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Correo electrónico"), EMAIL);
    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
    resolve();
    await screen.findByLabelText("Dígito 1 de 5");
  });
});

describe("paso 2 — código", () => {
  it("código válido avanza al paso de nueva contraseña", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToPasswordStep(user);

    expect(verifyResetCodeMock.mock.calls[0][0]).toEqual({ email: EMAIL, code: "13579" });
    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
  });

  it("400 → código inválido o expirado", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToCodeStep(user);
    verifyResetCodeMock.mockRejectedValueOnce(apiError(400));

    await typeCode(user, "00000");
    await user.click(screen.getByRole("button", { name: "Verificar código" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Código inválido o expirado.");
  });

  it("reenviar código: éxito muestra confirmación y limpia el código", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToCodeStep(user);
    forgotPasswordMock.mockResolvedValueOnce(undefined);

    await user.click(screen.getByRole("button", { name: "Reenviar código" }));

    expect(await screen.findByText("Código reenviado. Revisa tu correo.")).toBeInTheDocument();
    expect((screen.getByLabelText("Dígito 1 de 5") as HTMLInputElement).value).toBe("");
  });

  it("reenviar código: 429 muestra rate-limit", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToCodeStep(user);
    forgotPasswordMock.mockRejectedValueOnce(apiError(429));

    await user.click(screen.getByRole("button", { name: "Reenviar código" }));

    expect(await screen.findByText("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.")).toBeInTheDocument();
  });

  it("error genérico (red/500) al verificar → copia genérica", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToCodeStep(user);
    verifyResetCodeMock.mockRejectedValueOnce(apiError(500));

    await typeCode(user, "00000");
    await user.click(screen.getByRole("button", { name: "Verificar código" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos verificar el código. Inténtalo de nuevo."
    );
  });

  it("reenviar código: error genérico (red/500) → copia genérica", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToCodeStep(user);
    forgotPasswordMock.mockRejectedValueOnce(apiError(500));

    await user.click(screen.getByRole("button", { name: "Reenviar código" }));

    expect(
      await screen.findByText("No pudimos reenviar el código. Inténtalo de nuevo.")
    ).toBeInTheDocument();
  });

  it("429 → mensaje de rate-limit al verificar", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToCodeStep(user);
    verifyResetCodeMock.mockRejectedValueOnce(apiError(429));

    await typeCode(user, "00000");
    await user.click(screen.getByRole("button", { name: "Verificar código" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
    );
  });

  it("con el código incompleto, el submit del form no dispara la verificación", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToCodeStep(user);

    await typeCode(user, "135");
    // El botón ya está disabled con un código incompleto; el guard interno de
    // onSubmit es la segunda barrera (p.ej. si el submit llega por otra vía).
    const form = screen.getByRole("button", { name: "Verificar código" }).closest("form")!;
    fireEvent.submit(form);

    expect(verifyResetCodeMock).not.toHaveBeenCalled();
  });

  it("mientras se reenvía, el botón muestra 'Reenviando…' y se deshabilita", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToCodeStep(user);

    let resolve: () => void = () => {};
    forgotPasswordMock.mockReturnValueOnce(
      new Promise<void>((res) => {
        resolve = res;
      })
    );
    await user.click(screen.getByRole("button", { name: "Reenviar código" }));

    expect(screen.getByRole("button", { name: "Reenviando…" })).toBeDisabled();
    resolve();
    await screen.findByText("Código reenviado. Revisa tu correo.");
  });
});

describe("paso 3 — nueva contraseña", () => {
  it("contraseñas que no coinciden bloquean el envío con error de validación", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToPasswordStep(user);

    await user.type(screen.getByLabelText("Nueva contraseña"), "Sup3rSecret!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Otr4Distinta!");
    await user.click(screen.getByLabelText("Nueva contraseña"));
    await user.tab();

    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("éxito muestra confirmación y redirige a /login", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToPasswordStep(user);
    resetPasswordMock.mockResolvedValueOnce(undefined);

    await user.type(screen.getByLabelText("Nueva contraseña"), "Sup3rSecret!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Sup3rSecret!");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText(/Tu contraseña se actualizó/)).toBeInTheDocument();
    expect(resetPasswordMock.mock.calls[0][0]).toEqual({
      email: EMAIL,
      code: "13579",
      newPassword: "Sup3rSecret!",
      confirmPassword: "Sup3rSecret!",
    });

    jest.advanceTimersByTime(1800);
    expect(pushMock).toHaveBeenCalledWith("/login");
    jest.useRealTimers();
  });

  it("400 → código expirado, ofrece volver al paso de código", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToPasswordStep(user);
    resetPasswordMock.mockRejectedValueOnce(apiError(400));

    await user.type(screen.getByLabelText("Nueva contraseña"), "Sup3rSecret!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Sup3rSecret!");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(
      await screen.findByText("El código expiró o ya no es válido. Solicita uno nuevo.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Solicitar un código nuevo" }));

    // Vuelve al paso de código, con el código previo descartado.
    expect(await screen.findByLabelText("Dígito 1 de 5")).toBeInTheDocument();
    expect((screen.getByLabelText("Dígito 1 de 5") as HTMLInputElement).value).toBe("");
  });

  it("429 → mensaje de rate-limit, sin ofrecer volver al paso de código", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToPasswordStep(user);
    resetPasswordMock.mockRejectedValueOnce(apiError(429));

    await user.type(screen.getByLabelText("Nueva contraseña"), "Sup3rSecret!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Sup3rSecret!");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(
      await screen.findByText("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Solicitar un código nuevo" })).not.toBeInTheDocument();
  });

  it("error genérico (red/500) → copia genérica", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToPasswordStep(user);
    resetPasswordMock.mockRejectedValueOnce(apiError(500));

    await user.type(screen.getByLabelText("Nueva contraseña"), "Sup3rSecret!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Sup3rSecret!");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(
      await screen.findByText("No pudimos cambiar la contraseña. Inténtalo de nuevo.")
    ).toBeInTheDocument();
  });

  it("contraseña que no cumple la complejidad muestra el error del campo", async () => {
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToPasswordStep(user);

    await user.type(screen.getByLabelText("Nueva contraseña"), "corta");
    await user.click(screen.getByLabelText("Confirmar contraseña"));
    await user.tab();

    expect(await screen.findByText("Al menos 8 caracteres")).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("mientras la mutation está pendiente, el botón muestra 'Guardando…' y se deshabilita", async () => {
    let resolve: () => void = () => {};
    resetPasswordMock.mockReturnValueOnce(
      new Promise<void>((res) => {
        resolve = res;
      })
    );
    const { user } = renderWithQueryClient(<ForgotPasswordForm />);
    await goToPasswordStep(user);

    await user.type(screen.getByLabelText("Nueva contraseña"), "Sup3rSecret!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Sup3rSecret!");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
    resolve();
    await screen.findByText(/Tu contraseña se actualizó/);
  });

  // Único caso que SÍ necesita montar NewPasswordForm aislado: `onExpired` es
  // opcional, y el wizard siempre la pasa. La rama `codeExpired && onExpired`
  // vive como hijo de JSX, que la instrumentación de next/jest (SWC) no
  // registra — sin este test se puede borrar `&& onExpired` del fuente y la
  // suite sigue verde, reportando 100% de branches igual.
  it("sin `onExpired`, un 400 muestra el mensaje pero no ofrece pedir un código nuevo", async () => {
    resetPasswordMock.mockRejectedValueOnce(apiError(400));
    const { user } = renderWithQueryClient(
      <NewPasswordForm email={EMAIL} code="13579" />
    );

    await user.type(screen.getByLabelText("Nueva contraseña"), "Sup3rSecret!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Sup3rSecret!");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(
      await screen.findByText("El código expiró o ya no es válido. Solicita uno nuevo.")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Solicitar un código nuevo" })
    ).not.toBeInTheDocument();
  });
});
