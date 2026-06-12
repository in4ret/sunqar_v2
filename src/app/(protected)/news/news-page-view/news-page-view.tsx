"use client";

import { useMemo, useState } from "react";

import type { SourceOptionItem } from "@/lib/sources/source-options";

import { NewsPageCount } from "../news-page-count/news-page-count";
import { NewsPageSearchForm } from "../news-page-search-form/news-page-search-form";
import {
  NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG,
  setStoredNewsPageSources,
  useStoredNewsPageSources,
} from "../news-page-search-form/news-page-search-form-storage";

import styles from "./news-page-view.module.scss";

type NewsPageViewProps = {
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

export function NewsPageView({ searchFrom, searchQuery, searchTo, sources }: NewsPageViewProps) {
  const selectedSources = useStoredNewsPageSources(NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG);
  const [pendingSearchState, setPendingSearchState] = useState<PendingSearchState>(null);
  const [searchTrigger, setSearchTrigger] = useState(0);
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
  const submittedSearchFrom = hasPendingSearchState ? pendingSearchState.nextSearchFrom : searchFrom;
  const submittedSearchQuery = hasPendingSearchState ? pendingSearchState.nextSearchQuery : searchQuery;
  const submittedSearchTo = hasPendingSearchState ? pendingSearchState.nextSearchTo : searchTo;

  return (
    <section className={styles["news-page"]}>
      <NewsPageSearchForm
        key={JSON.stringify([searchFrom, searchQuery, searchTo])}
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
        searchFrom={searchFrom}
        searchQuery={searchQuery}
        searchTo={searchTo}
        selectedSources={validatedSelectedSources}
        setSelectedSources={(nextSources) => {
          setStoredNewsPageSources(NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG, nextSources);
        }}
        sources={sources}
      />
      <NewsPageCount
        hasLoadedStoredSources={selectedSources !== null}
        searchFrom={submittedSearchFrom}
        searchQuery={submittedSearchQuery}
        searchTo={submittedSearchTo}
        searchTrigger={searchTrigger}
        selectedSources={validatedSelectedSources}
      />
    </section>
  );
}
