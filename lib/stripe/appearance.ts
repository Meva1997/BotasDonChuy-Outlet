import type { Appearance } from "@stripe/stripe-js";

/**
 * Apariencia del Payment Element.
 *
 * El Element se renderiza dentro de un iframe de Stripe: Tailwind NO entra ahí,
 * así que el Design System se replica con el Appearance API o el formulario de
 * tarjeta se ve como una isla blanca en medio del checkout oscuro. Los valores
 * son los de `fieldBase`/`labelBase` en `components/ui/FormControls.tsx`
 * traducidos a CSS plano — al tocar aquellos, tocar estos.
 *
 * Deliberadamente NO se pasa la opción `fonts` de Elements para cargar Jost
 * dentro del iframe: eso pediría la fuente a Google Fonts, un tercero que el
 * Aviso de Privacidad no declara entre sus proveedores. Un tipo de letra
 * ligeramente distinto en un campo de tarjeta cuesta menos que un tratamiento
 * de datos no informado, así que se deja la pila del sistema.
 */
export const STRIPE_APPEARANCE: Appearance = {
  // "night" ya parte de fondo oscuro: las variables de abajo solo lo corrigen
  // hacia el ámbar/tabaco de la tienda, en vez de reconstruir un tema entero.
  theme: "night",
  variables: {
    colorPrimary: "#fbbf24", // amber-400 — foco y acentos
    colorBackground: "rgba(41, 37, 36, 0.6)", // stone-800/60, igual que fieldBase
    colorText: "#fffbeb", // amber-50
    colorTextSecondary: "rgba(254, 243, 199, 0.7)", // amber-100/70, como labelBase
    colorTextPlaceholder: "rgba(254, 243, 199, 0.4)", // amber-100/40
    colorDanger: "#f87171", // red-400
    fontFamily: "system-ui, sans-serif",
    fontSizeBase: "14px", // text-sm
    fontWeightNormal: "400",
    fontLineHeight: "1.5",
    borderRadius: "6px", // rounded-md
    spacingUnit: "4px",
    // Los iconos que Stripe dibuja DENTRO del campo (el candado, la lupa del
    // CVC y el logo de la marca que él sí detecta) salen en su gris por
    // defecto: sobre el tabaco de la tienda se ven como manchas grises. Estas
    // cinco variables son la única manera de teñirlos — el iframe no acepta
    // reglas CSS para ellos.
    colorIcon: "rgba(254, 243, 199, 0.5)", // amber-100/50
    colorIconHover: "#fbbf24", // amber-400
    colorIconCardCvc: "rgba(254, 243, 199, 0.5)",
    colorIconCardCvcError: "#f87171",
    colorIconCardError: "#f87171",
    // Iguala el anillo ámbar del :focus-visible global de globals.css: sin
    // esto el foco dentro del iframe se dibuja con el azul de Stripe y el
    // recorrido con teclado cambia de color al entrar al formulario de pago.
    focusBoxShadow: "0 0 0 3px rgba(217, 119, 6, 0.2)",
    focusOutline: "none",
  },
  // Explícitos, no heredados del `auto`: es la misma disposición que
  // FormControls.tsx da al resto del checkout (etiqueta arriba, campos
  // separados), y fijarla evita que el formulario de pago se reacomode solo si
  // Stripe cambia su default.
  inputs: "spaced",
  labels: "above",
  rules: {
    ".Input": {
      border: "1px solid rgba(217, 119, 6, 0.4)", // border-amber-600/40
      boxShadow: "none",
      padding: "12px 16px", // px-4 py-3
      transition: "all 200ms",
    },
    ".Input:hover": {
      border: "1px solid rgba(245, 158, 11, 0.7)", // hover:border-amber-500/70
    },
    ".Input:focus": {
      border: "1px solid #fbbf24", // focus:border-amber-400
      backgroundColor: "rgba(41, 37, 36, 0.9)", // focus:bg-stone-800/90
      boxShadow: "0 0 0 3px rgba(217, 119, 6, 0.2)",
    },
    ".Input::placeholder": {
      color: "rgba(254, 243, 199, 0.4)", // amber-100/40, como los de FormControls
    },
    ".Input--invalid": {
      border: "1px solid rgba(239, 68, 68, 0.6)", // border-red-500/60
      boxShadow: "none",
    },
    // Sin esta regla el `.Input:focus` de arriba gana y el campo se pinta en
    // ámbar en cuanto lo tocas para corregirlo: el dato sigue mal, pero se ve
    // válido. El rojo tiene que sobrevivir al foco.
    ".Input--invalid:focus": {
      border: "1px solid #f87171", // red-400
      backgroundColor: "rgba(41, 37, 36, 0.9)",
      boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.2)",
    },
    ".Label": {
      fontSize: "10px",
      letterSpacing: "0.25em",
      textTransform: "uppercase",
      marginBottom: "8px", // mb-2
    },
    // Las pestañas de método. Hoy NO se ven: con solo tarjeta habilitada el
    // Element se salta la barra. Se estilan de todos modos porque qué métodos
    // se ofrecen se decide en el Dashboard de Stripe (configuración invisible
    // desde este repo, ver PaymentSection.tsx): el día que alguien encienda
    // otro, la barra aparece sola y saldría con el gris de fábrica.
    ".Tab": {
      border: "1px solid rgba(217, 119, 6, 0.4)",
      boxShadow: "none",
    },
    ".Tab:hover": {
      border: "1px solid rgba(245, 158, 11, 0.7)",
      color: "#fffbeb", // amber-50
    },
    ".Tab--selected": {
      border: "1px solid #fbbf24",
      backgroundColor: "rgba(251, 191, 36, 0.1)",
      color: "#fbbf24",
      boxShadow: "0 0 0 3px rgba(217, 119, 6, 0.2)",
    },
    ".TabLabel": {
      fontSize: "11px",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
    },
    ".Error": {
      fontSize: "11px",
      marginTop: "6px", // mt-1.5
    },
  },
};
