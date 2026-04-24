import "@testing-library/jest-dom";

// jsdom não implementa matchMedia — alguns hooks do app o usam.
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

// jsdom não implementa IntersectionObserver — usado por SmartImage/animações.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [] as IntersectionObserverEntry[];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
}
// @ts-expect-error — atribui mock ao global
window.IntersectionObserver = MockIntersectionObserver;
// @ts-expect-error — atribui mock ao global
globalThis.IntersectionObserver = MockIntersectionObserver;
