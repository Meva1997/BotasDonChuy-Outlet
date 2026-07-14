"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

const LENGTH = 5;

const boxBase =
  "h-16 w-full text-center font-serif text-2xl text-amber-50 caret-amber-400 bg-stone-800/60 border rounded-md outline-none transition-all duration-200 hover:border-amber-500/70 focus:border-amber-400 focus:bg-stone-800/90 focus:shadow-[0_0_0_3px_rgba(217,119,6,0.2)] disabled:opacity-50 disabled:cursor-not-allowed";

interface CodeInputProps {
  /** Código actual, hasta 5 dígitos. Componente controlado. */
  value: string;
  onChange: (value: string) => void;
  /** Se llama cuando las 5 casillas quedan llenas (auto-submit opcional). */
  onComplete?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Input OTP de 5 casillas — auto-avance, backspace que retrocede y pegar un
 * código completo. Estética luxury (mismo borde/glow ámbar que FormControls).
 */
export default function CodeInput({
  value,
  onChange,
  onComplete,
  error,
  disabled,
  autoFocus,
}: CodeInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(LENGTH - 1, index));
    inputs.current[clamped]?.focus();
    inputs.current[clamped]?.select();
  };

  const commit = (next: string) => {
    onChange(next);
    if (next.length === LENGTH) onComplete?.(next);
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    // value es contiguo: escribir en una casilla vacía más allá del final
    // insertaría el dígito en una posición equivocada. Acotamos al primer hueco
    // libre para que el dígito y el foco caigan donde el usuario espera.
    const at = Math.min(index, value.length);
    const next = (value.slice(0, at) + digit + value.slice(at + 1)).slice(
      0,
      LENGTH,
    );
    commit(next);
    if (at < LENGTH - 1) focusBox(at + 1);
  };

  const handleFocus = (index: number) => {
    // Evita que el foco quede en una casilla-hueco: redirige a la primera libre.
    if (index > value.length) focusBox(value.length);
    else inputs.current[index]?.select();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        focusBox(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    const next = (
      value.slice(0, index) +
      pasted +
      value.slice(index + pasted.length)
    ).slice(0, LENGTH);
    commit(next);
    focusBox(index + pasted.length);
  };

  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Dígito ${index + 1} de ${LENGTH}`}
          aria-invalid={!!error}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={() => handleFocus(index)}
          className={`${boxBase} ${
            error ? "border-red-500/60" : "border-amber-600/40"
          }`}
        />
      ))}
    </div>
  );
}
