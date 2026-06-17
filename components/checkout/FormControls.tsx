import { forwardRef } from "react";

const fieldBase =
  "w-full bg-stone-800/60 border px-4 py-3 text-sm text-amber-50 placeholder:text-amber-100/40 rounded-md outline-none transition-all duration-200 hover:border-amber-500/70 focus:border-amber-400 focus:bg-stone-800/90 focus:shadow-[0_0_0_3px_rgba(217,119,6,0.2)]";

const labelBase =
  "block text-[10px] tracking-[0.25em] uppercase text-amber-100/70 mb-2";

function borderClass(hasError?: boolean) {
  return hasError ? "border-red-500/60" : "border-amber-600/40";
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[11px] text-red-400/90">{message}</p>;
}

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, id, className = "", ...props }, ref) {
    return (
      <div className={className}>
        <label htmlFor={id} className={labelBase}>
          {label}
        </label>
        <input
          id={id}
          ref={ref}
          aria-invalid={!!error}
          className={`${fieldBase} ${borderClass(!!error)}`}
          {...props}
        />
        <FieldError message={error} />
      </div>
    );
  }
);

interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: readonly string[];
  placeholder?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    { label, error, id, options, placeholder, className = "", ...props },
    ref
  ) {
    return (
      <div className={className}>
        <label htmlFor={id} className={labelBase}>
          {label}
        </label>
        <select
          id={id}
          ref={ref}
          aria-invalid={!!error}
          defaultValue=""
          className={`${fieldBase} ${borderClass(!!error)} cursor-pointer`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option} value={option} className="bg-stone-900">
              {option}
            </option>
          ))}
        </select>
        <FieldError message={error} />
      </div>
    );
  }
);
