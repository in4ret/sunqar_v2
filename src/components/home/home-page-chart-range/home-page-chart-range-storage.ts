"use client";

import { useSyncExternalStore } from "react";

import type { HomePageChartRange } from "@/lib/home-page-stats";

export type HomePageChartRangeStorageConfig = {
  changeEventName: string;
  storageKey: string;
};

export const DEFAULT_HOME_PAGE_CHART_RANGE: HomePageChartRange = "month-daily";

export function isHomePageChartRange(value: string): value is HomePageChartRange {
  return value === "month-daily" || value === "six-months-weekly" || value === "all-time-monthly";
}

export function getStoredHomePageChartRange(config: HomePageChartRangeStorageConfig) {
  if (typeof window === "undefined") {
    return DEFAULT_HOME_PAGE_CHART_RANGE;
  }

  const storedRange = window.localStorage.getItem(config.storageKey);

  return storedRange && isHomePageChartRange(storedRange)
    ? storedRange
    : DEFAULT_HOME_PAGE_CHART_RANGE;
}

export function subscribeToStoredHomePageChartRange(
  config: HomePageChartRangeStorageConfig,
  onStoreChange: () => void
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

export function setStoredHomePageChartRange(
  config: HomePageChartRangeStorageConfig,
  range: HomePageChartRange
) {
  window.localStorage.setItem(config.storageKey, range);
  window.dispatchEvent(new Event(config.changeEventName));
}

export function useStoredHomePageChartRange(config: HomePageChartRangeStorageConfig) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToStoredHomePageChartRange(config, onStoreChange),
    () => getStoredHomePageChartRange(config),
    () => DEFAULT_HOME_PAGE_CHART_RANGE
  );
}
