import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoredCommentsPageChartSources,
  setStoredCommentsPageChartSources,
} from "./comments-page-scatter-chart-storage";

const TEST_STORAGE_CONFIG = {
  changeEventName: "sunqar-comments-chart-sources-change-test",
  storageKey: "sunqar-comments-chart-sources-test",
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

test("getStoredCommentsPageChartSources restores normalized stored values", () => {
  const previousWindow = globalThis.window;
  const mockWindow = createMockWindow();

  mockWindow.localStorage.setItem(TEST_STORAGE_CONFIG.storageKey, JSON.stringify([" YouTube ", "ig"]));
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
  });

  assert.deepEqual(getStoredCommentsPageChartSources(TEST_STORAGE_CONFIG), ["youtube", "ig"]);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});

test("getStoredCommentsPageChartSources ignores malformed and invalid stored values", () => {
  const previousWindow = globalThis.window;
  const mockWindow = createMockWindow();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
  });

  mockWindow.localStorage.setItem(TEST_STORAGE_CONFIG.storageKey, "{bad json");
  assert.deepEqual(getStoredCommentsPageChartSources(TEST_STORAGE_CONFIG), []);

  mockWindow.localStorage.setItem(TEST_STORAGE_CONFIG.storageKey, JSON.stringify({ source: "youtube" }));
  assert.deepEqual(getStoredCommentsPageChartSources(TEST_STORAGE_CONFIG), []);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});

test("setStoredCommentsPageChartSources writes normalized values", () => {
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

  setStoredCommentsPageChartSources(TEST_STORAGE_CONFIG, [" YouTube ", "youtube", "ig"]);

  assert.equal(
    mockWindow.localStorage.getItem(TEST_STORAGE_CONFIG.storageKey),
    JSON.stringify(["youtube", "ig"]),
  );
  assert.equal(didDispatchChangeEvent, true);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});
