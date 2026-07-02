"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { getNewsTabRoute, type NewsTab } from "@/lib/routes";
import type { SourceOptionItem } from "@/lib/sources/source-options";
import {
  formatDateTimeLocalValueToEpochSeconds,
  getDefaultNewsPageSearchFromValue,
} from "@/lib/utils";

import { NewsPageCount } from "../news-page-count/news-page-count";
import { NewsPageSearchForm } from "../news-page-search-form/news-page-search-form";
import {
  NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG,
  useStoredNewsPageSources,
} from "../news-page-search-form/news-page-search-form-storage";
import { NewsPageSourceChart } from "../news-page-source-chart/news-page-source-chart";
import { NewsPageTable } from "../news-page-table/news-page-table";
import { NewsReportModal } from "../news-report-modal/news-report-modal";

import styles from "./news-page-view.module.scss";

type NewsPageViewProps = {
  activeTab: NewsTab;
  aiModels: Array<{ label: string; value: string }>;
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

function buildNewsTabHref(tab: NewsTab, input: { searchFrom: string; searchQuery: string; searchTo: string }) {
  const nextUrl = new URL(getNewsTabRoute(tab), "http://sunqar.local");

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

export function NewsPageView({
  activeTab,
  aiModels,
  displaySearchFrom,
  displaySearchTo,
  searchFrom,
  searchQuery,
  searchTo,
  sources,
}: NewsPageViewProps) {
  const t = useTranslations();
  const storedSelectedSources = useStoredNewsPageSources(NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG);
  const [primarySelectedRowIds, setPrimarySelectedRowIds] = useState<string[]>([]);
  const [relatedSelectedRowIds, setRelatedSelectedRowIds] = useState<string[]>([]);
  const [pendingSearchState, setPendingSearchState] = useState<PendingSearchState>(null);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [submittedSelectedSources, setSubmittedSelectedSources] = useState<string[] | null>(null);
  const [hasPendingSearchChanges, setHasPendingSearchChanges] = useState(false);
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
    () => (storedSelectedSources ?? []).filter((source) => availableSourceValues.has(source)),
    [availableSourceValues, storedSelectedSources],
  );
  const validatedAppliedSelectedSources = useMemo(
    () => (submittedSelectedSources ?? validatedSelectedSources).filter((source) => availableSourceValues.has(source)),
    [availableSourceValues, submittedSelectedSources, validatedSelectedSources],
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
  const reportIds = useMemo(
    () => Array.from(new Set([...primarySelectedRowIds, ...relatedSelectedRowIds])),
    [primarySelectedRowIds, relatedSelectedRowIds],
  );
  const isSearchReady = !shouldUseDefaultSearchFrom || defaultSearchFrom !== "";
  const selectedSourcesKey = validatedAppliedSelectedSources.join("\u0000");
  const contentClassName = hasPendingSearchChanges
    ? `${styles["news-page-content"]} ${styles["news-page-content-blurred"]}`
    : styles["news-page-content"];

  const tabs = useMemo(
    () => [
      {
        href: buildNewsTabHref("chart", { searchFrom, searchQuery, searchTo }),
        id: "chart" as const,
        label: t("news.tabs.chart"),
        panelId: "news-chart-panel",
      },
      {
        href: buildNewsTabHref("text", { searchFrom, searchQuery, searchTo }),
        id: "text" as const,
        label: t("news.tabs.text"),
        panelId: "news-text-panel",
      },
    ],
    [searchFrom, searchQuery, searchTo, t],
  );

  return (
    <section className={styles["news-page"]}>
      <NewsPageSearchForm
        key={JSON.stringify([effectiveDisplaySearchFrom, searchQuery, displaySearchTo, selectedSourcesKey])}
        activeTab={activeTab}
        initialSelectedSources={validatedAppliedSelectedSources}
        onSearchChangeStateChange={setHasPendingSearchChanges}
        onSearchSubmit={({
          searchFrom: nextSearchFrom,
          searchQuery: nextSearchQuery,
          searchTo: nextSearchTo,
          selectedSources: nextSelectedSources,
        }) => {
          setPendingSearchState({
            nextSearchFrom,
            nextSearchQuery,
            nextSearchTo,
            previousSearchFrom: searchFrom,
            previousSearchQuery: searchQuery,
            previousSearchTo: searchTo,
          });
          setSubmittedSelectedSources(nextSelectedSources);
          setSearchTrigger((currentValue) => currentValue + 1);
        }}
        searchFrom={effectiveDisplaySearchFrom}
        searchQuery={searchQuery}
        searchTo={displaySearchTo}
        sources={sources}
      />
      <div className={contentClassName} inert={hasPendingSearchChanges}>
        <div className={styles["news-page-toolbar"]}>
          <div aria-label={t("news.tabs.label")} className={styles["news-page-tabs"]} role="tablist">
            {tabs.map((tab) => (
              <Link
                aria-controls={tab.panelId}
                aria-selected={activeTab === tab.id}
                className={styles["news-page-tab"]}
                href={tab.href}
                id={`news-${tab.id}-tab`}
                key={tab.id}
                role="tab"
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <NewsPageCount
            hasLoadedStoredSources={storedSelectedSources !== null && isSearchReady}
            selectedSources={validatedAppliedSelectedSources}
            searchFrom={submittedSearchFrom}
            searchQuery={submittedSearchQuery}
            searchTo={submittedSearchTo}
            searchTrigger={searchTrigger}
          />
        </div>
        {activeTab === "chart" ? (
          <div
            aria-labelledby="news-chart-tab"
            className={styles["news-page-tab-panel"]}
            id="news-chart-panel"
            role="tabpanel"
          >
            <NewsPageSourceChart
              hasLoadedStoredSources={storedSelectedSources !== null && isSearchReady}
              searchFrom={submittedSearchFrom}
              searchQuery={submittedSearchQuery}
              searchTo={submittedSearchTo}
              searchTrigger={searchTrigger}
              selectedSources={validatedAppliedSelectedSources}
            />
          </div>
        ) : (
          <div
            aria-labelledby="news-text-tab"
            className={styles["news-page-tab-panel"]}
            id="news-text-panel"
            role="tabpanel"
          >
            <NewsPageTable
              hasLoadedStoredSources={storedSelectedSources !== null && isSearchReady}
              onPrimarySelectedRowIdsChange={setPrimarySelectedRowIds}
              onRelatedSelectedRowIdsChange={setRelatedSelectedRowIds}
              searchFrom={submittedSearchFrom}
              searchQuery={submittedSearchQuery}
              searchTo={submittedSearchTo}
              searchTrigger={searchTrigger}
              selectedSources={validatedAppliedSelectedSources}
            />
            <NewsReportModal aiModels={aiModels} ids={reportIds} keyWords={submittedSearchQuery} />
          </div>
        )}
      </div>
    </section>
  );
}
