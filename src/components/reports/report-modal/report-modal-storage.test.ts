import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoredReportModalAiModel,
  resolveStoredReportModalAiModel,
  setStoredReportModalAiModel,
} from "./report-modal-storage";

const TEST_STORAGE_CONFIG = {
  changeEventName: "sunqar-report-ai-model-change-test",
  storageKey: "sunqar-report-ai-model-test",
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

test("getStoredReportModalAiModel returns empty string for missing and invalid stored values", () => {
  const previousWindow = globalThis.window;
  const mockWindow = createMockWindow();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
  });

  assert.equal(getStoredReportModalAiModel(TEST_STORAGE_CONFIG), "");

  mockWindow.localStorage.setItem(TEST_STORAGE_CONFIG.storageKey, "   ");
  assert.equal(getStoredReportModalAiModel(TEST_STORAGE_CONFIG), "");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});

test("setStoredReportModalAiModel writes normalized model value and dispatches change event", () => {
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

  setStoredReportModalAiModel(TEST_STORAGE_CONFIG, "  gpt-4.1  ");

  assert.equal(
    mockWindow.localStorage.getItem(TEST_STORAGE_CONFIG.storageKey),
    "gpt-4.1",
  );
  assert.equal(didDispatchChangeEvent, true);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});

test("resolveStoredReportModalAiModel keeps only available model values", () => {
  assert.equal(
    resolveStoredReportModalAiModel("gpt-4.1", [
      { value: "gpt-4.1" },
      { value: "gpt-4.1-mini" },
    ]),
    "gpt-4.1",
  );

  assert.equal(
    resolveStoredReportModalAiModel("missing-model", [
      { value: "gpt-4.1" },
      { value: "gpt-4.1-mini" },
    ]),
    "",
  );
});
