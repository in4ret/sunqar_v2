"use client";

import { useSyncExternalStore } from "react";

import type { NewsChartAggregation } from "@/lib/news/news-chart-shared";

type NewsPageSourceChartStorageConfig = {
  changeEventName: string;
  storageKey: string;
};

const DEFAULT_NEWS_PAGE_SOURCE_CHART_AGGREGATION: NewsChartAggregation = "sources";
const storedNewsPageSourceChartAggregationCache = new Map<
  string,
  {
    aggregation: NewsChartAggregation;
    rawValue: string | null;
  }
>();

export const NEWS_PAGE_SOURCE_CHART_STORAGE_CONFIG: NewsPageSourceChartStorageConfig = {
  changeEventName: "sunqar-news-chart-aggregation-change",
  storageKey: "sunqar-news-chart-aggregation",
};

export function normalizeStoredNewsPageSourceChartAggregation(value: unknown): NewsChartAggregation {
  return value === "countries" ? "countries" : "sources";
}

export function getStoredNewsPageSourceChartAggregation(config: NewsPageSourceChartStorageConfig) {
  if (typeof window === "undefined") {
    return DEFAULT_NEWS_PAGE_SOURCE_CHART_AGGREGATION;
  }

  const storedValue = window.localStorage.getItem(config.storageKey);
  const cachedValue = storedNewsPageSourceChartAggregationCache.get(config.storageKey);

  if (cachedValue?.rawValue === storedValue) {
    return cachedValue.aggregation;
  }

  if (!storedValue) {
    storedNewsPageSourceChartAggregationCache.set(config.storageKey, {
      aggregation: DEFAULT_NEWS_PAGE_SOURCE_CHART_AGGREGATION,
      rawValue: null,
    });

    return DEFAULT_NEWS_PAGE_SOURCE_CHART_AGGREGATION;
  }

  try {
    const aggregation = normalizeStoredNewsPageSourceChartAggregation(JSON.parse(storedValue));

    storedNewsPageSourceChartAggregationCache.set(config.storageKey, {
      aggregation,
      rawValue: storedValue,
    });

    return aggregation;
  } catch {
    storedNewsPageSourceChartAggregationCache.set(config.storageKey, {
      aggregation: DEFAULT_NEWS_PAGE_SOURCE_CHART_AGGREGATION,
      rawValue: storedValue,
    });

    return DEFAULT_NEWS_PAGE_SOURCE_CHART_AGGREGATION;
  }
}

export function subscribeToStoredNewsPageSourceChartAggregation(
  config: NewsPageSourceChartStorageConfig,
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

export function setStoredNewsPageSourceChartAggregation(
  config: NewsPageSourceChartStorageConfig,
  aggregation: NewsChartAggregation,
) {
  window.localStorage.setItem(
    config.storageKey,
    JSON.stringify(normalizeStoredNewsPageSourceChartAggregation(aggregation)),
  );
  window.dispatchEvent(new Event(config.changeEventName));
}

export function useStoredNewsPageSourceChartAggregation(config: NewsPageSourceChartStorageConfig) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToStoredNewsPageSourceChartAggregation(config, onStoreChange),
    () => getStoredNewsPageSourceChartAggregation(config),
    () => DEFAULT_NEWS_PAGE_SOURCE_CHART_AGGREGATION,
  );
}
