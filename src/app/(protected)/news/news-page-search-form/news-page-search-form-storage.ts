"use client";

import { useSyncExternalStore } from "react";

import { normalizeSearchQuery } from "@/lib/utils";

type NewsPageSearchFormStorageConfig = {
  changeEventName: string;
  storageKey: string;
};

export type StoredNewsPageSearchState = {
  searchQuery: string;
  selectedSources: string[];
};

const DEFAULT_STORED_NEWS_PAGE_SOURCES: string[] = [];
const DEFAULT_STORED_NEWS_PAGE_SEARCH_STATE: StoredNewsPageSearchState = {
  searchQuery: "",
  selectedSources: DEFAULT_STORED_NEWS_PAGE_SOURCES,
};
const storedNewsPageSourcesCache = new Map<
  string,
  {
    rawValue: string | null;
    sources: string[];
  }
>();
const storedNewsPageSearchStateCache = new Map<
  string,
  {
    rawValue: string | null;
    searchState: StoredNewsPageSearchState;
  }
>();

export const NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG: NewsPageSearchFormStorageConfig = {
  changeEventName: "sunqar-news-sources-change",
  storageKey: "sunqar-news-sources",
};

export const NEWS_PAGE_SEARCH_STATE_STORAGE_CONFIG: NewsPageSearchFormStorageConfig = {
  changeEventName: "sunqar-news-search-state-change",
  storageKey: "sunqar-news-search-state",
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeStoredNewsPageSearchState(value: unknown): StoredNewsPageSearchState {
  if (!value || typeof value !== "object") {
    return DEFAULT_STORED_NEWS_PAGE_SEARCH_STATE;
  }

  const candidate = value as Partial<Record<keyof StoredNewsPageSearchState, unknown>>;
  const selectedSources = isStringArray(candidate.selectedSources) ? candidate.selectedSources : [];

  return {
    searchQuery:
      typeof candidate.searchQuery === "string" ? normalizeSearchQuery(candidate.searchQuery) : "",
    selectedSources,
  };
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

export function getStoredNewsPageSearchState(config: NewsPageSearchFormStorageConfig) {
  if (typeof window === "undefined") {
    return DEFAULT_STORED_NEWS_PAGE_SEARCH_STATE;
  }

  const storedValue = window.localStorage.getItem(config.storageKey);
  const cachedValue = storedNewsPageSearchStateCache.get(config.storageKey);

  if (cachedValue?.rawValue === storedValue) {
    return cachedValue.searchState;
  }

  if (!storedValue) {
    storedNewsPageSearchStateCache.set(config.storageKey, {
      rawValue: null,
      searchState: DEFAULT_STORED_NEWS_PAGE_SEARCH_STATE,
    });

    return DEFAULT_STORED_NEWS_PAGE_SEARCH_STATE;
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    const searchState = normalizeStoredNewsPageSearchState(parsedValue);

    storedNewsPageSearchStateCache.set(config.storageKey, {
      rawValue: storedValue,
      searchState,
    });

    return searchState;
  } catch {
    storedNewsPageSearchStateCache.set(config.storageKey, {
      rawValue: storedValue,
      searchState: DEFAULT_STORED_NEWS_PAGE_SEARCH_STATE,
    });

    return DEFAULT_STORED_NEWS_PAGE_SEARCH_STATE;
  }
}

export function setStoredNewsPageSearchState(
  config: NewsPageSearchFormStorageConfig,
  searchState: StoredNewsPageSearchState,
) {
  window.localStorage.setItem(
    config.storageKey,
    JSON.stringify(normalizeStoredNewsPageSearchState(searchState)),
  );
  window.dispatchEvent(new Event(config.changeEventName));
}

export function useStoredNewsPageSources(config: NewsPageSearchFormStorageConfig) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToStoredNewsPageSources(config, onStoreChange),
    () => getStoredNewsPageSources(config),
    () => null,
  );
}
