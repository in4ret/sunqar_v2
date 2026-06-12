"use client";

import { useSyncExternalStore } from "react";

type NewsPageSearchFormStorageConfig = {
  changeEventName: string;
  storageKey: string;
};

const DEFAULT_STORED_NEWS_PAGE_SOURCES: string[] = [];
const storedNewsPageSourcesCache = new Map<
  string,
  {
    rawValue: string | null;
    sources: string[];
  }
>();

export const NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG: NewsPageSearchFormStorageConfig = {
  changeEventName: "sunqar-news-sources-change",
  storageKey: "sunqar-news-sources",
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function getStoredNewsPageSources(config: NewsPageSearchFormStorageConfig) {
  if (typeof window === "undefined") {
    return DEFAULT_STORED_NEWS_PAGE_SOURCES;
  }

  const storedValue = window.localStorage.getItem(config.storageKey);
  const cachedValue = storedNewsPageSourcesCache.get(config.storageKey);

  if (cachedValue?.rawValue === storedValue) {
    return cachedValue.sources;
  }

  if (!storedValue) {
    storedNewsPageSourcesCache.set(config.storageKey, {
      rawValue: null,
      sources: DEFAULT_STORED_NEWS_PAGE_SOURCES,
    });

    return DEFAULT_STORED_NEWS_PAGE_SOURCES;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!isStringArray(parsedValue)) {
      storedNewsPageSourcesCache.set(config.storageKey, {
        rawValue: storedValue,
        sources: DEFAULT_STORED_NEWS_PAGE_SOURCES,
      });

      return DEFAULT_STORED_NEWS_PAGE_SOURCES;
    }

    storedNewsPageSourcesCache.set(config.storageKey, {
      rawValue: storedValue,
      sources: parsedValue,
    });

    return parsedValue;
  } catch {
    storedNewsPageSourcesCache.set(config.storageKey, {
      rawValue: storedValue,
      sources: DEFAULT_STORED_NEWS_PAGE_SOURCES,
    });

    return DEFAULT_STORED_NEWS_PAGE_SOURCES;
  }
}

export function subscribeToStoredNewsPageSources(
  config: NewsPageSearchFormStorageConfig,
  onStoreChange: () => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(config.changeEventName, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(config.changeEventName, handleChange);
  };
}

export function setStoredNewsPageSources(
  config: NewsPageSearchFormStorageConfig,
  sources: string[],
) {
  window.localStorage.setItem(config.storageKey, JSON.stringify(sources));
  window.dispatchEvent(new Event(config.changeEventName));
}

export function useStoredNewsPageSources(config: NewsPageSearchFormStorageConfig) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToStoredNewsPageSources(config, onStoreChange),
    () => getStoredNewsPageSources(config),
    () => null,
  );
}
