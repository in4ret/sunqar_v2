import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoredNewsPageSearchState,
  setStoredNewsPageSearchState,
} from "./news-page-search-form-storage";

const TEST_STORAGE_CONFIG = {
  changeEventName: "sunqar-news-search-state-change-test",
  storageKey: "sunqar-news-search-state-test",
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

test("getStoredNewsPageSearchState restores normalized query and selected sources while ignoring legacy dates", () => {
  const previousWindow = globalThis.window;
  const mockWindow = createMockWindow();

  mockWindow.localStorage.setItem(
    TEST_STORAGE_CONFIG.storageKey,
    JSON.stringify({
      searchFrom: "1710000000",
      searchQuery: "  climate  ",
      searchTo: "1720000000",
      selectedSources: ["source-a", "source-b"],
    }),
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
  });

  assert.deepEqual(getStoredNewsPageSearchState(TEST_STORAGE_CONFIG), {
    searchQuery: "climate",
    selectedSources: ["source-a", "source-b"],
  });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});

test("getStoredNewsPageSearchState ignores malformed and invalid stored values", () => {
  const previousWindow = globalThis.window;
  const mockWindow = createMockWindow();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
  });

  mockWindow.localStorage.setItem(TEST_STORAGE_CONFIG.storageKey, "{bad json");
  assert.deepEqual(getStoredNewsPageSearchState(TEST_STORAGE_CONFIG), {
    searchQuery: "",
    selectedSources: [],
  });

  mockWindow.localStorage.setItem(TEST_STORAGE_CONFIG.storageKey, JSON.stringify({ searchQuery: 123 }));
  assert.deepEqual(getStoredNewsPageSearchState(TEST_STORAGE_CONFIG), {
    searchQuery: "",
    selectedSources: [],
  });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});

test("setStoredNewsPageSearchState writes query and selected sources without dates", () => {
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

  setStoredNewsPageSearchState(TEST_STORAGE_CONFIG, {
    searchQuery: "  economy  ",
    selectedSources: ["source-a", "source-b"],
  });

  assert.equal(
    mockWindow.localStorage.getItem(TEST_STORAGE_CONFIG.storageKey),
    JSON.stringify({
      searchQuery: "economy",
      selectedSources: ["source-a", "source-b"],
    }),
  );
  assert.equal(didDispatchChangeEvent, true);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});
