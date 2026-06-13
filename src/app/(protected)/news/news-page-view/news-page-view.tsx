"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import type { SourceOptionItem } from "@/lib/sources/source-options";
import {
  formatDateTimeLocalValueToEpochSeconds,
  getDefaultNewsPageSearchFromValue,
} from "@/lib/utils";

import { NewsPageCount } from "../news-page-count/news-page-count";
import { NewsPageSearchForm } from "../news-page-search-form/news-page-search-form";
import {
  NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG,
  setStoredNewsPageSources,
  useStoredNewsPageSources,
} from "../news-page-search-form/news-page-search-form-storage";
import { NewsPageSourceChart } from "../news-page-source-chart/news-page-source-chart";
import { NewsPageTable } from "../news-page-table/news-page-table";

import styles from "./news-page-view.module.scss";

type NewsPageViewProps = {
  displaySearchFrom: string;
  displaySearchTo: string;
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
  sources: SourceOptionItem[];
};

type PendingSearchState = {
  nextSearchFrom: string;
  nextSearchQuery: string;
  nextSearchTo: string;
  previousSearchFrom: string;
  previousSearchQuery: string;
  previousSearchTo: string;
} | null;

function subscribeToDefaultSearchFrom() {
  return () => {};
}

export function NewsPageView({
  displaySearchFrom,
  displaySearchTo,
  searchFrom,
  searchQuery,
  searchTo,
  sources,
}: NewsPageViewProps) {
  const selectedSources = useStoredNewsPageSources(NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG);
  const [pendingSearchState, setPendingSearchState] = useState<PendingSearchState>(null);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const shouldUseDefaultSearchFrom = searchFrom === "" && searchTo === "";
  const defaultSearchFrom = useSyncExternalStore(
    subscribeToDefaultSearchFrom,
    () => (shouldUseDefaultSearchFrom ? getDefaultNewsPageSearchFromValue() : ""),
    () => "",
  );
  const availableSourceValues = useMemo(
    () => new Set(sources.map((source) => source.name)),
    [sources],
  );
  const validatedSelectedSources = useMemo(
    () => (selectedSources ?? []).filter((source) => availableSourceValues.has(source)),
    [availableSourceValues, selectedSources],
  );
  const hasPendingSearchState =
    pendingSearchState &&
    pendingSearchState.previousSearchFrom === searchFrom &&
    pendingSearchState.previousSearchQuery === searchQuery &&
    pendingSearchState.previousSearchTo === searchTo;
  const effectiveDisplaySearchFrom = shouldUseDefaultSearchFrom ? defaultSearchFrom : displaySearchFrom;
  const effectiveSearchFromEpochSeconds = shouldUseDefaultSearchFrom
    ? formatDateTimeLocalValueToEpochSeconds(defaultSearchFrom)
    : searchFrom;
  const submittedSearchFrom = hasPendingSearchState
    ? pendingSearchState.nextSearchFrom
    : effectiveSearchFromEpochSeconds;
  const submittedSearchQuery = hasPendingSearchState ? pendingSearchState.nextSearchQuery : searchQuery;
  const submittedSearchTo = hasPendingSearchState ? pendingSearchState.nextSearchTo : searchTo;
  const isSearchReady = !shouldUseDefaultSearchFrom || defaultSearchFrom !== "";

  return (
    <section className={styles["news-page"]}>
      <NewsPageSearchForm
        key={JSON.stringify([effectiveDisplaySearchFrom, searchQuery, displaySearchTo])}
        onSearchSubmit={({ searchFrom: nextSearchFrom, searchQuery: nextSearchQuery, searchTo: nextSearchTo }) => {
          setPendingSearchState({
            nextSearchFrom,
            nextSearchQuery,
            nextSearchTo,
            previousSearchFrom: searchFrom,
            previousSearchQuery: searchQuery,
            previousSearchTo: searchTo,
          });
          setSearchTrigger((currentValue) => currentValue + 1);
        }}
        searchFrom={effectiveDisplaySearchFrom}
        searchQuery={searchQuery}
        searchTo={displaySearchTo}
        selectedSources={validatedSelectedSources}
        setSelectedSources={(nextSources) => {
          setStoredNewsPageSources(NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG, nextSources);
        }}
        sources={sources}
      />
      <NewsPageCount
        hasLoadedStoredSources={selectedSources !== null && isSearchReady}
        searchFrom={submittedSearchFrom}
        searchQuery={submittedSearchQuery}
        searchTo={submittedSearchTo}
        searchTrigger={searchTrigger}
        selectedSources={validatedSelectedSources}
      />
      <NewsPageSourceChart
        hasLoadedStoredSources={selectedSources !== null && isSearchReady}
        searchFrom={submittedSearchFrom}
        searchQuery={submittedSearchQuery}
        searchTo={submittedSearchTo}
        searchTrigger={searchTrigger}
        selectedSources={validatedSelectedSources}
      />
      <NewsPageTable
        hasLoadedStoredSources={selectedSources !== null && isSearchReady}
        searchFrom={submittedSearchFrom}
        searchQuery={submittedSearchQuery}
        searchTo={submittedSearchTo}
        searchTrigger={searchTrigger}
        selectedSources={validatedSelectedSources}
      />
    </section>
  );
}
