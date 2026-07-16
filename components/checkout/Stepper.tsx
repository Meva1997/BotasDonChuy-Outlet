"use client";

import { CHECKOUT_STEPS, type CheckoutStep } from "./CheckoutContext";

function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
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
  /** Paso más avanzado ya visitado: es el tope hasta donde se puede saltar. */
  maxVisited: CheckoutStep;
  onNavigate: (step: CheckoutStep) => void;
}

export default function Stepper({
  current,
  maxVisited,
  onNavigate,
}: StepperProps) {
  return (
    <nav aria-label="Progreso del checkout" className="w-full max-w-xl mx-auto">
      <ol className="flex items-center">
        {CHECKOUT_STEPS.map((label, index) => {
          const isDone = index < current;
          const isActive = index === current;
          const isLast = index === CHECKOUT_STEPS.length - 1;
          // Ya se estuvo aquí, pero quedó adelante del paso actual (se retrocedió).
          // No es "completado" —falta confirmarlo— pero tampoco está intacto: sus
          // datos siguen ahí, así que se pinta a medio camino entre ambos.
          const isVisited = index > current && index <= maxVisited;
          // Se puede ir a cualquier paso ya visitado —atrás para revisar, o de
          // vuelta adelante— pero nunca a uno sin visitar, ni moverse una vez
          // confirmado el pedido (paso final).
          const canNavigate =
            !isActive &&
            index <= maxVisited &&
            current !== CHECKOUT_STEPS.length - 1;

          const circle = (
            <span className="relative flex items-center justify-center">
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-amber-500/40 blur-md animate-glow-pulse"
                />
              )}
              <span
                aria-current={isActive ? "step" : undefined}
                className={`relative flex items-center justify-center w-9 h-9 rounded-full border text-xs font-medium transition-colors duration-300 ${
                  isActive
                    ? "border-amber-400 text-stone-950 bg-linear-to-br from-amber-400 to-amber-600 shadow-[0_0_0_4px_rgba(217,119,6,0.15)]"
                    : isDone
                      ? "border-amber-500/70 text-amber-500 bg-amber-500/10"
                      : isVisited
                        ? "border-amber-500/35 text-amber-100/60 bg-amber-500/5"
                        : "border-amber-900/50 text-amber-100/30"
                }`}
              >
                {isDone ? <Check /> : index + 1}
              </span>
            </span>
          );

          const labelText = (
            <span
              className={`text-[9px] sm:text-[10px] tracking-[0.08em] sm:tracking-[0.2em] uppercase whitespace-nowrap ${
                isActive
                  ? "text-amber-50"
                  : isDone || isVisited
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
                  aria-label={`Ir a ${label}`}
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
                  className={`flex-1 min-w-1.5 h-px mx-1.5 sm:mx-3 -mt-6 transition-colors duration-500 ${
                    isDone
                      ? "bg-amber-500/70"
                      : index < maxVisited
                        ? "bg-amber-500/25"
                        : "bg-amber-900/40"
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
