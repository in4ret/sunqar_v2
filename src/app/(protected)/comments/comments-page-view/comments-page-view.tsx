"use client";

import { useState, useSyncExternalStore } from "react";

import {
  formatDateTimeLocalValueToEpochSeconds,
  getDefaultNewsPageSearchFromValue,
} from "@/lib/utils";
import type { MultiSelectOption } from "@/ui";

import { CommentsPageCount } from "../comments-page-count/comments-page-count";
import { CommentsPageSearchForm } from "../comments-page-search-form/comments-page-search-form";
import {
  COMMENTS_PAGE_SEARCH_FORM_STORAGE_CONFIG,
  setStoredCommentsPagePosts,
  useStoredCommentsPagePosts,
} from "../comments-page-search-form/comments-page-search-form-storage";

import styles from "./comments-page-view.module.scss";

type CommentsPageViewProps = {
  availablePostValues: string[];
  displaySearchFrom: string;
  displaySearchTo: string;
  postOptions: MultiSelectOption[];
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
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

export function CommentsPageView({
  availablePostValues,
  displaySearchFrom,
  displaySearchTo,
  postOptions,
  searchFrom,
  searchQuery,
  searchTo,
}: CommentsPageViewProps) {
  const selectedPosts = useStoredCommentsPagePosts(COMMENTS_PAGE_SEARCH_FORM_STORAGE_CONFIG);
  const [pendingSearchState, setPendingSearchState] = useState<PendingSearchState>(null);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const shouldUseDefaultSearchFrom = searchFrom === "" && searchTo === "";
  const defaultSearchFrom = useSyncExternalStore(
    subscribeToDefaultSearchFrom,
    () => (shouldUseDefaultSearchFrom ? getDefaultNewsPageSearchFromValue() : ""),
    () => "",
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
  const hasLoadedStoredPosts = selectedPosts !== null && isSearchReady;

  return (
    <section className={styles["comments-page"]}>
      <CommentsPageSearchForm
        key={JSON.stringify([effectiveDisplaySearchFrom, searchQuery, displaySearchTo])}
        onSearchSubmit={({ searchFrom: nextSearchFrom, searchQuery: nextSearchQuery, searchTo: nextSearchTo }) => {
          setPendingSearchState({
            nextSearchFrom,
            nextSearchQuery: nextSearchQuery,
            nextSearchTo,
            previousSearchFrom: searchFrom,
            previousSearchQuery: searchQuery,
            previousSearchTo: searchTo,
          });
          setSearchTrigger((currentValue) => currentValue + 1);
        }}
        availablePostValues={availablePostValues}
        postOptions={postOptions}
        searchFrom={effectiveDisplaySearchFrom}
        searchQuery={searchQuery}
        searchTo={displaySearchTo}
        selectedPosts={selectedPosts ?? []}
        setSelectedPosts={(nextPosts) => {
          setStoredCommentsPagePosts(COMMENTS_PAGE_SEARCH_FORM_STORAGE_CONFIG, nextPosts);
        }}
      />
      <div className={styles["comments-page-toolbar"]}>
        <CommentsPageCount
          hasLoadedStoredPosts={hasLoadedStoredPosts}
          searchFrom={submittedSearchFrom}
          searchQuery={submittedSearchQuery}
          searchTo={submittedSearchTo}
          searchTrigger={searchTrigger}
          selectedPosts={selectedPosts ?? []}
        />
      </div>
    </section>
  );
}
