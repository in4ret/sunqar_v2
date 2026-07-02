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
  const storedSelectedPosts = useStoredCommentsPagePosts(COMMENTS_PAGE_SEARCH_FORM_STORAGE_CONFIG);
  const [pendingSearchState, setPendingSearchState] = useState<PendingSearchState>(null);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [submittedSelectedPosts, setSubmittedSelectedPosts] = useState<string[] | null>(null);
  const [hasPendingSearchChanges, setHasPendingSearchChanges] = useState(false);
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
    () => (storedSelectedPosts ?? []).filter((post) => availablePostValuesSet.has(post)),
    [availablePostValuesSet, storedSelectedPosts],
  );
  const validatedAppliedSelectedPosts = useMemo(
    () => (submittedSelectedPosts ?? validatedSelectedPosts).filter((post) => availablePostValuesSet.has(post)),
    [availablePostValuesSet, submittedSelectedPosts, validatedSelectedPosts],
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
  const selectedPostsKey = validatedAppliedSelectedPosts.join("\u0000");

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
  const contentClassName = hasPendingSearchChanges
    ? `${styles["comments-page-content"]} ${styles["comments-page-content-blurred"]}`
    : styles["comments-page-content"];

  return (
    <section className={styles["comments-page"]}>
      <CommentsPageSearchForm
        key={JSON.stringify([activeTab, effectiveDisplaySearchFrom, searchQuery, displaySearchTo, selectedPostsKey])}
        activeTab={activeTab}
        availablePostValues={availablePostValues}
        initialSelectedPosts={validatedAppliedSelectedPosts}
        onSearchChangeStateChange={setHasPendingSearchChanges}
        onSearchSubmit={({
          searchFrom: nextSearchFrom,
          searchQuery: nextSearchQuery,
          searchTo: nextSearchTo,
          selectedPosts: nextSelectedPosts,
        }) => {
          setPendingSearchState({
            nextSearchFrom,
            nextSearchQuery,
            nextSearchTo,
            previousSearchFrom: searchFrom,
            previousSearchQuery: searchQuery,
            previousSearchTo: searchTo,
          });
          setSubmittedSelectedPosts(nextSelectedPosts);
          setSearchTrigger((currentValue) => currentValue + 1);
        }}
        postOptions={postOptions}
        searchFrom={effectiveDisplaySearchFrom}
        searchQuery={searchQuery}
        searchTo={displaySearchTo}
      />
      <div className={contentClassName} inert={hasPendingSearchChanges}>
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
            hasLoadedStoredPosts={storedSelectedPosts !== null && isSearchReady}
            selectedPosts={validatedAppliedSelectedPosts}
            searchFrom={submittedSearchFrom}
            searchQuery={submittedSearchQuery}
            searchTo={submittedSearchTo}
            searchTrigger={searchTrigger}
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
              hasLoadedStoredPosts={storedSelectedPosts !== null && isSearchReady}
              searchFrom={submittedSearchFrom}
              searchQuery={submittedSearchQuery}
              searchTo={submittedSearchTo}
              searchTrigger={searchTrigger}
              selectedPosts={validatedAppliedSelectedPosts}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
