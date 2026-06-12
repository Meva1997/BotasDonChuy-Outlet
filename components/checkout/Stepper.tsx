"use client";

import { CHECKOUT_STEPS, type CheckoutStep } from "./CheckoutContext";

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7.5 5.5 10.5 11.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface StepperProps {
  current: CheckoutStep;
  onNavigate: (step: CheckoutStep) => void;
}

export default function Stepper({ current, onNavigate }: StepperProps) {
  return (
    <nav aria-label="Progreso del checkout" className="w-full max-w-xl mx-auto">
      <ol className="flex items-center">
        {CHECKOUT_STEPS.map((label, index) => {
          const isDone = index < current;
          const isActive = index === current;
          const isLast = index === CHECKOUT_STEPS.length - 1;
          // Solo se puede regresar a un paso ya completado, y nunca una vez
          // confirmado el pedido (paso final). No se permite avanzar haciendo clic.
          const canNavigate = isDone && current !== CHECKOUT_STEPS.length - 1;

          const circle = (
            <span
              aria-current={isActive ? "step" : undefined}
              className={`flex items-center justify-center w-9 h-9 rounded-full border text-xs font-medium transition-colors ${
                isActive
                  ? "border-amber-400 text-stone-950 bg-amber-400"
                  : isDone
                    ? "border-amber-400/70 text-amber-400"
                    : "border-amber-900/50 text-amber-100/30"
              }`}
            >
              {isDone ? <Check /> : index + 1}
            </span>
          );

          const labelText = (
            <span
              className={`text-[10px] tracking-[0.2em] uppercase whitespace-nowrap ${
                isActive
                  ? "text-amber-50"
                  : isDone
                    ? "text-amber-100/50"
                    : "text-amber-100/25"
              }`}
            >
              {label}
            </span>
          );

          return (
            <li
              key={label}
              className={`flex items-center ${isLast ? "" : "flex-1"}`}
            >
              {canNavigate ? (
                <button
                  type="button"
                  onClick={() => onNavigate(index as CheckoutStep)}
                  aria-label={`Volver a ${label}`}
                  className="flex flex-col items-center gap-2 shrink-0 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                >
                  {circle}
                  {labelText}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-2 shrink-0">
                  {circle}
                  {labelText}
                </div>
              )}

              {!isLast && (
                <span
                  className={`flex-1 h-px mx-3 -mt-6 transition-colors ${
                    isDone ? "bg-amber-400/60" : "bg-amber-900/40"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
