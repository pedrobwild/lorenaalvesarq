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
// Atribui o mock ao global (cast para evitar mismatch de tipos)
(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  MockIntersectionObserver;
(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  MockIntersectionObserver;
