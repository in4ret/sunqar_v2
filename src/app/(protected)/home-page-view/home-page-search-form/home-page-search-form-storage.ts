"use client";

import { normalizeSearchQuery } from "@/lib/utils";

export type StoredHomePageSearchState = {
  searchQuery: string;
};

type HomePageSearchFormStorageConfig = {
  changeEventName: string;
  storageKey: string;
};

const DEFAULT_STORED_HOME_PAGE_SEARCH_STATE: StoredHomePageSearchState = {
  searchQuery: "",
};
const storedHomePageSearchStateCache = new Map<
  string,
  {
    rawValue: string | null;
    searchState: StoredHomePageSearchState;
  }
>();

export const HOME_PAGE_SEARCH_STATE_STORAGE_CONFIG: HomePageSearchFormStorageConfig = {
  changeEventName: "sunqar-home-search-state-change",
  storageKey: "sunqar-home-search-state",
};

function normalizeStoredHomePageSearchState(value: unknown): StoredHomePageSearchState {
  if (!value || typeof value !== "object") {
    return DEFAULT_STORED_HOME_PAGE_SEARCH_STATE;
  }

  const candidate = value as Partial<Record<keyof StoredHomePageSearchState, unknown>>;

  return {
    searchQuery:
      typeof candidate.searchQuery === "string" ? normalizeSearchQuery(candidate.searchQuery) : "",
  };
}

export function getStoredHomePageSearchState(config: HomePageSearchFormStorageConfig) {
  if (typeof window === "undefined") {
    return DEFAULT_STORED_HOME_PAGE_SEARCH_STATE;
  }

  const storedValue = window.localStorage.getItem(config.storageKey);
  const cachedValue = storedHomePageSearchStateCache.get(config.storageKey);

  if (cachedValue?.rawValue === storedValue) {
    return cachedValue.searchState;
  }

  if (!storedValue) {
    storedHomePageSearchStateCache.set(config.storageKey, {
      rawValue: null,
      searchState: DEFAULT_STORED_HOME_PAGE_SEARCH_STATE,
    });

    return DEFAULT_STORED_HOME_PAGE_SEARCH_STATE;
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    const searchState = normalizeStoredHomePageSearchState(parsedValue);

    storedHomePageSearchStateCache.set(config.storageKey, {
      rawValue: storedValue,
      searchState,
    });

    return searchState;
  } catch {
    storedHomePageSearchStateCache.set(config.storageKey, {
      rawValue: storedValue,
      searchState: DEFAULT_STORED_HOME_PAGE_SEARCH_STATE,
    });

    return DEFAULT_STORED_HOME_PAGE_SEARCH_STATE;
  }
}

export function setStoredHomePageSearchState(
  config: HomePageSearchFormStorageConfig,
  searchState: StoredHomePageSearchState,
) {
  window.localStorage.setItem(
    config.storageKey,
    JSON.stringify(normalizeStoredHomePageSearchState(searchState)),
  );
  window.dispatchEvent(new Event(config.changeEventName));
}
