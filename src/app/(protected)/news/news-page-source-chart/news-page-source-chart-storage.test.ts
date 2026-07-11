import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoredNewsPageSourceChartAggregation,
  setStoredNewsPageSourceChartAggregation,
} from "./news-page-source-chart-storage";

const TEST_STORAGE_CONFIG = {
  changeEventName: "sunqar-news-chart-aggregation-change-test",
  storageKey: "sunqar-news-chart-aggregation-test",
};

type MockWindow = Window &
  typeof globalThis & {
    __listeners: Map<string, Set<(event: Event) => void>>;
  };

function createMockWindow() {
  const storage = new Map<string, string>();
  const listeners = new Map<string, Set<(event: Event) => void>>();

  const mockWindow = {
    __listeners: listeners,
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      const callback =
        typeof listener === "function" ? listener : listener.handleEvent.bind(listener);
      const typeListeners = listeners.get(type) ?? new Set();

      typeListeners.add(callback);
      listeners.set(type, typeListeners);
    },
    dispatchEvent(event: Event) {
      const typeListeners = listeners.get(event.type);

      typeListeners?.forEach((listener) => {
        listener(event);
      });

      return true;
    },
    localStorage: {
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      removeItem(key: string) {
        storage.delete(key);
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      const callback =
        typeof listener === "function" ? listener : listener.handleEvent.bind(listener);

      listeners.get(type)?.delete(callback);
    },
  };

  return mockWindow as MockWindow;
}

test("getStoredNewsPageSourceChartAggregation restores valid stored values", () => {
  const previousWindow = globalThis.window;
  const mockWindow = createMockWindow();

  mockWindow.localStorage.setItem(TEST_STORAGE_CONFIG.storageKey, JSON.stringify("countries"));
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
  });

  assert.equal(getStoredNewsPageSourceChartAggregation(TEST_STORAGE_CONFIG), "countries");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});

test("getStoredNewsPageSourceChartAggregation falls back to sources for malformed values", () => {
  const previousWindow = globalThis.window;
  const mockWindow = createMockWindow();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
  });

  mockWindow.localStorage.setItem(TEST_STORAGE_CONFIG.storageKey, "{bad json");
  assert.equal(getStoredNewsPageSourceChartAggregation(TEST_STORAGE_CONFIG), "sources");

  mockWindow.localStorage.setItem(TEST_STORAGE_CONFIG.storageKey, JSON.stringify("invalid"));
  assert.equal(getStoredNewsPageSourceChartAggregation(TEST_STORAGE_CONFIG), "sources");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});

test("setStoredNewsPageSourceChartAggregation writes normalized values", () => {
  const previousWindow = globalThis.window;
  const mockWindow = createMockWindow();
  let didDispatchChangeEvent = false;

  mockWindow.addEventListener(TEST_STORAGE_CONFIG.changeEventName, () => {
    didDispatchChangeEvent = true;
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
  });

  setStoredNewsPageSourceChartAggregation(TEST_STORAGE_CONFIG, "countries");

  assert.equal(
    mockWindow.localStorage.getItem(TEST_STORAGE_CONFIG.storageKey),
    JSON.stringify("countries"),
  );
  assert.equal(didDispatchChangeEvent, true);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});
