"use client";

import { useSyncExternalStore } from "react";

import { normalizeStoredCommentsPageChartSources } from "./comments-page-scatter-chart-source-selection";

type CommentsPageScatterChartStorageConfig = {
  changeEventName: string;
  storageKey: string;
};

const DEFAULT_STORED_COMMENTS_PAGE_CHART_SOURCES: string[] = [];
const storedCommentsPageChartSourcesCache = new Map<
  string,
  {
    rawValue: string | null;
    sources: string[];
  }
>();

export const COMMENTS_PAGE_SCATTER_CHART_STORAGE_CONFIG: CommentsPageScatterChartStorageConfig = {
  changeEventName: "sunqar-comments-chart-sources-change",
  storageKey: "sunqar-comments-chart-sources",
};

export function getStoredCommentsPageChartSources(config: CommentsPageScatterChartStorageConfig) {
  if (typeof window === "undefined") {
    return DEFAULT_STORED_COMMENTS_PAGE_CHART_SOURCES;
  }

  const storedValue = window.localStorage.getItem(config.storageKey);
  const cachedValue = storedCommentsPageChartSourcesCache.get(config.storageKey);

  if (cachedValue?.rawValue === storedValue) {
    return cachedValue.sources;
  }

  if (!storedValue) {
    storedCommentsPageChartSourcesCache.set(config.storageKey, {
      rawValue: null,
      sources: DEFAULT_STORED_COMMENTS_PAGE_CHART_SOURCES,
    });

    return DEFAULT_STORED_COMMENTS_PAGE_CHART_SOURCES;
  }

  try {
    const normalizedSources = normalizeStoredCommentsPageChartSources(JSON.parse(storedValue));

    storedCommentsPageChartSourcesCache.set(config.storageKey, {
      rawValue: storedValue,
      sources: normalizedSources,
    });

    return normalizedSources;
  } catch {
    storedCommentsPageChartSourcesCache.set(config.storageKey, {
      rawValue: storedValue,
      sources: DEFAULT_STORED_COMMENTS_PAGE_CHART_SOURCES,
    });

    return DEFAULT_STORED_COMMENTS_PAGE_CHART_SOURCES;
  }
}

export function subscribeToStoredCommentsPageChartSources(
  config: CommentsPageScatterChartStorageConfig,
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

export function setStoredCommentsPageChartSources(
  config: CommentsPageScatterChartStorageConfig,
  sources: string[],
) {
  window.localStorage.setItem(
    config.storageKey,
    JSON.stringify(normalizeStoredCommentsPageChartSources(sources)),
  );
  window.dispatchEvent(new Event(config.changeEventName));
}

export function useStoredCommentsPageChartSources(config: CommentsPageScatterChartStorageConfig) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToStoredCommentsPageChartSources(config, onStoreChange),
    () => getStoredCommentsPageChartSources(config),
    () => DEFAULT_STORED_COMMENTS_PAGE_CHART_SOURCES,
  );
}
