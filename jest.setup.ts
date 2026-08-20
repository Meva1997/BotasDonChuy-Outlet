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

// jsdom tampoco implementa `IntersectionObserver`, y framer-motion lo usa para
// `whileInView` (Hero, Footer, AboutUs, LegalLayout) — sin este stub, montar
// cualquiera de esos componentes revienta con "IntersectionObserver is not defined".
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  class MockIntersectionObserver {
    observe = () => {};
    unobserve = () => {};
    disconnect = () => {};
  }
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: MockIntersectionObserver,
  });
}

// `scrollTo` SÍ existe en jsdom (por eso no lleva guard de ausencia como los dos
// de arriba): existe y lanza "Not implemented", que jsdom escupe por console.error.
// Framer-motion lo llama al animar `height: "auto"` (NavHeader) — para medir la
// altura natural quita los estilos, y como eso puede mover el scroll de la página,
// guarda la posición y la repone con `window.scrollTo` (motion-dom,
// `measureAllKeyframes`). No hay nada que simular: en jsdom no hay scroll real.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "scrollTo", {
    writable: true,
    value: () => {},
  });
}

// jsdom no navega entre documentos, así que cualquier clic sobre un <a href> real
// (los <Link> del menú móvil en NavHeader) imprime "Not implemented: navigation".
// El listener va en fase de burbuja sobre document: corre DESPUÉS de los handlers
// de React, así que no altera lo que el componente hace con el clic — solo cancela
// la navegación que jsdom no puede ejecutar de todos modos. Los enlaces de hash sí
// funcionan en jsdom y se dejan pasar.
if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const anchor = (event.target as HTMLElement | null)?.closest?.("a");
    const href = anchor?.getAttribute("href");
    if (href && !href.startsWith("#")) event.preventDefault();
  });
}
