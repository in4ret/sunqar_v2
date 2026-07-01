"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { CommentsTab } from "@/lib/routes";
import { getCommentsTabRoute } from "@/lib/routes";
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
import { CommentsPageTable } from "../comments-page-table/comments-page-table";

import styles from "./comments-page-view.module.scss";

type CommentsPageViewProps = {
  activeTab: CommentsTab;
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

function buildCommentsTabHref(
  tab: CommentsTab,
  input: { searchFrom: string; searchQuery: string; searchTo: string },
) {
  const nextUrl = new URL(getCommentsTabRoute(tab), "http://sunqar.local");

  if (input.searchFrom) {
    nextUrl.searchParams.set("from", input.searchFrom);
  }

  if (input.searchQuery) {
    nextUrl.searchParams.set("q", input.searchQuery);
  }

  if (input.searchTo) {
    nextUrl.searchParams.set("to", input.searchTo);
  }

  return `${nextUrl.pathname}${nextUrl.search}`;
}

export function CommentsPageView({
  activeTab,
  availablePostValues,
  displaySearchFrom,
  displaySearchTo,
  postOptions,
  searchFrom,
  searchQuery,
  searchTo,
}: CommentsPageViewProps) {
  const t = useTranslations();
  const selectedPosts = useStoredCommentsPagePosts(COMMENTS_PAGE_SEARCH_FORM_STORAGE_CONFIG);
  const [pendingSearchState, setPendingSearchState] = useState<PendingSearchState>(null);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const shouldUseDefaultSearchFrom = searchFrom === "" && searchTo === "";
  const defaultSearchFrom = useSyncExternalStore(
    subscribeToDefaultSearchFrom,
    () => (shouldUseDefaultSearchFrom ? getDefaultNewsPageSearchFromValue() : ""),
    () => "",
  );
  const availablePostValuesSet = useMemo(
    () => new Set(availablePostValues),
    [availablePostValues],
  );
  const validatedSelectedPosts = useMemo(
    () => (selectedPosts ?? []).filter((post) => availablePostValuesSet.has(post)),
    [availablePostValuesSet, selectedPosts],
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
  const tabs = useMemo(
    () => [
      {
        href: buildCommentsTabHref("chart", { searchFrom, searchQuery, searchTo }),
        id: "chart" as const,
        label: t("comments.tabs.chart"),
        panelId: "comments-chart-panel",
      },
      {
        href: buildCommentsTabHref("text", { searchFrom, searchQuery, searchTo }),
        id: "text" as const,
        label: t("comments.tabs.text"),
        panelId: "comments-text-panel",
      },
      {
        href: buildCommentsTabHref("upload", { searchFrom, searchQuery, searchTo }),
        id: "upload" as const,
        label: t("comments.tabs.upload"),
        panelId: "comments-upload-panel",
      },
    ],
    [searchFrom, searchQuery, searchTo, t],
  );
  const activeTabPanelId = tabs.find((tab) => tab.id === activeTab)?.panelId ?? "comments-chart-panel";

  return (
    <section className={styles["comments-page"]}>
      <CommentsPageSearchForm
        key={JSON.stringify([activeTab, effectiveDisplaySearchFrom, searchQuery, displaySearchTo])}
        activeTab={activeTab}
        availablePostValues={availablePostValues}
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
        <div aria-label={t("comments.tabs.label")} className={styles["comments-page-tabs"]} role="tablist">
          {tabs.map((tab) => (
            <Link
              aria-controls={tab.panelId}
              aria-selected={activeTab === tab.id}
              className={styles["comments-page-tab"]}
              href={tab.href}
              id={`comments-${tab.id}-tab`}
              key={tab.id}
              role="tab"
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <CommentsPageCount
          hasLoadedStoredPosts={selectedPosts !== null && isSearchReady}
          searchFrom={submittedSearchFrom}
          searchQuery={submittedSearchQuery}
          searchTo={submittedSearchTo}
          searchTrigger={searchTrigger}
          selectedPosts={validatedSelectedPosts}
        />
      </div>
      <div
        aria-labelledby={`comments-${activeTab}-tab`}
        className={styles["comments-page-tab-panel"]}
        id={activeTabPanelId}
        role="tabpanel"
      >
        {activeTab === "text" ? (
          <CommentsPageTable
            hasLoadedStoredPosts={selectedPosts !== null && isSearchReady}
            searchFrom={submittedSearchFrom}
            searchQuery={submittedSearchQuery}
            searchTo={submittedSearchTo}
            searchTrigger={searchTrigger}
            selectedPosts={validatedSelectedPosts}
          />
        ) : null}
      </div>
    </section>
  );
}
