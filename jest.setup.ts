import "@testing-library/jest-dom";

// jsdom no implementa `matchMedia`, y framer-motion lo llama desde `useReducedMotion()` (lo usa
// ImportResults, entre otros). Sin este stub, montar cualquier componente animado revienta con
// "window.matchMedia is not a function" antes de llegar a la primera aserción.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
