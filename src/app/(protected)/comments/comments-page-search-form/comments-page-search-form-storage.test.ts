import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoredCommentsPageSearchState,
  setStoredCommentsPageSearchState,
} from "./comments-page-search-form-storage";

const TEST_STORAGE_CONFIG = {
  changeEventName: "sunqar-comments-search-state-change-test",
  storageKey: "sunqar-comments-search-state-test",
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

test("getStoredCommentsPageSearchState restores normalized query and selected posts while ignoring legacy dates", () => {
  const previousWindow = globalThis.window;
  const mockWindow = createMockWindow();

  mockWindow.localStorage.setItem(
    TEST_STORAGE_CONFIG.storageKey,
    JSON.stringify({
      searchFrom: "1710000000",
      searchQuery: "  toxic  ",
      searchTo: "1720000000",
      selectedPosts: ["post-a", "post-b"],
    }),
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
  });

  assert.deepEqual(getStoredCommentsPageSearchState(TEST_STORAGE_CONFIG), {
    searchQuery: "toxic",
    selectedPosts: ["post-a", "post-b"],
  });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});

test("getStoredCommentsPageSearchState ignores malformed and invalid stored values", () => {
  const previousWindow = globalThis.window;
  const mockWindow = createMockWindow();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
  });

  mockWindow.localStorage.setItem(TEST_STORAGE_CONFIG.storageKey, "{bad json");
  assert.deepEqual(getStoredCommentsPageSearchState(TEST_STORAGE_CONFIG), {
    searchQuery: "",
    selectedPosts: [],
  });

  mockWindow.localStorage.setItem(TEST_STORAGE_CONFIG.storageKey, JSON.stringify({ selectedPosts: "post-a" }));
  assert.deepEqual(getStoredCommentsPageSearchState(TEST_STORAGE_CONFIG), {
    searchQuery: "",
    selectedPosts: [],
  });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});

test("setStoredCommentsPageSearchState writes query and selected posts without dates", () => {
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

  setStoredCommentsPageSearchState(TEST_STORAGE_CONFIG, {
    searchQuery: "  comment  ",
    selectedPosts: ["post-a", "post-b"],
  });

  assert.equal(
    mockWindow.localStorage.getItem(TEST_STORAGE_CONFIG.storageKey),
    JSON.stringify({
      searchQuery: "comment",
      selectedPosts: ["post-a", "post-b"],
    }),
  );
  assert.equal(didDispatchChangeEvent, true);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});
