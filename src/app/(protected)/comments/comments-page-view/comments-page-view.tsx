"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { ReportModal } from "@/components/reports";
import type { CommentsTab } from "@/lib/routes";
import { getCommentsTabRoute } from "@/lib/routes";
import {
  formatDateTimeLocalValueToEpochSeconds,
  formatEpochSecondsToDateTimeLocalValue,
  getDefaultNewsPageSearchFromValue,
} from "@/lib/utils";
import { type MultiSelectOption, useToast } from "@/ui";

import { CommentsPageCount } from "../comments-page-count/comments-page-count";
import { CommentsPageScatterChart } from "../comments-page-scatter-chart/comments-page-scatter-chart";
import { CommentsPageSearchForm } from "../comments-page-search-form/comments-page-search-form";
import {
  COMMENTS_PAGE_SEARCH_FORM_STORAGE_CONFIG,
  COMMENTS_PAGE_SEARCH_STATE_STORAGE_CONFIG,
  getStoredCommentsPageSearchState,
  useStoredCommentsPagePosts,
} from "../comments-page-search-form/comments-page-search-form-storage";
import { CommentsPageTable } from "../comments-page-table/comments-page-table";
import { CommentsUploadForm } from "../comments-upload-form/comments-upload-form";

import styles from "./comments-page-view.module.scss";

type CommentsPageViewProps = {
  activeTab: CommentsTab;
  aiModels: Array<{ label: string; value: string }>;
  availablePostValues: string[];
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
  aiModels,
  availablePostValues,
  postOptions,
  searchFrom,
  searchQuery,
  searchTo,
}: CommentsPageViewProps) {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const hasSearchParams = searchParams.has("from") || searchParams.has("q") || searchParams.has("to");
  const storedSearchState = hasSearchParams
    ? null
    : getStoredCommentsPageSearchState(COMMENTS_PAGE_SEARCH_STATE_STORAGE_CONFIG);
  const hasStoredSearchStateToRestore =
    !hasSearchParams &&
    !!storedSearchState?.searchQuery;
  const storedSelectedPosts = useStoredCommentsPagePosts(COMMENTS_PAGE_SEARCH_FORM_STORAGE_CONFIG);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [pendingSearchState, setPendingSearchState] = useState<PendingSearchState>(null);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [submittedSelectedPosts, setSubmittedSelectedPosts] = useState<string[] | null>(null);
  const [hasPendingSearchChanges, setHasPendingSearchChanges] = useState(false);
  const isSearchStateResolved = hasSearchParams || !hasStoredSearchStateToRestore;
  const shouldUseDefaultSearchFrom = isSearchStateResolved && searchFrom === "" && searchTo === "";
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
  const effectiveDisplaySearchFrom = shouldUseDefaultSearchFrom
    ? defaultSearchFrom
    : formatEpochSecondsToDateTimeLocalValue(searchFrom);
  const effectiveDisplaySearchTo = formatEpochSecondsToDateTimeLocalValue(searchTo);
  const effectiveSearchFromEpochSeconds = shouldUseDefaultSearchFrom
    ? formatDateTimeLocalValueToEpochSeconds(defaultSearchFrom)
    : searchFrom;
  const submittedSearchFrom = hasPendingSearchState
    ? pendingSearchState.nextSearchFrom
    : effectiveSearchFromEpochSeconds;
  const submittedSearchQuery = hasPendingSearchState ? pendingSearchState.nextSearchQuery : searchQuery;
  const submittedSearchTo = hasPendingSearchState ? pendingSearchState.nextSearchTo : searchTo;
  const isSearchReady = isSearchStateResolved && (!shouldUseDefaultSearchFrom || defaultSearchFrom !== "");
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

  useEffect(() => {
    if (!hasStoredSearchStateToRestore || !storedSearchState) {
      return;
    }

    const nextUrl = new URL(getCommentsTabRoute(activeTab), window.location.origin);

    if (storedSearchState.searchQuery) {
      nextUrl.searchParams.set("q", storedSearchState.searchQuery);
    }

    router.replace(`${nextUrl.pathname}${nextUrl.search}`);
  }, [activeTab, hasStoredSearchStateToRestore, router, storedSearchState]);

  async function handleReportSubmit({ model, prompt }: { model: string; prompt: string }) {
    setIsReportSubmitting(true);

    try {
      const response = await fetch("/api/comments/report", {
        body: JSON.stringify({
          from: submittedSearchFrom,
          model,
          posts: validatedAppliedSelectedPosts,
          prompt,
          query: submittedSearchQuery,
          to: submittedSearchTo,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        let errorMessage = t("report-modal.submit-error");

        try {
          const responseData = (await response.json()) as { error?: string };

          if (typeof responseData.error === "string" && responseData.error.trim()) {
            errorMessage = responseData.error.trim();
          }
        } catch {
          errorMessage = t("report-modal.submit-error");
        }

        throw new Error(errorMessage);
      }

      setIsReportModalOpen(false);
    } catch (error) {
      console.error("Failed to submit comments report request.", error);
      showToast({
        message: error instanceof Error ? error.message : t("report-modal.submit-error"),
        status: "error",
      });
    } finally {
      setIsReportSubmitting(false);
    }
  }

  return (
    <section className={styles["comments-page"]}>
      <CommentsPageSearchForm
        key={JSON.stringify([activeTab, effectiveDisplaySearchFrom, searchQuery, effectiveDisplaySearchTo, selectedPostsKey])}
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
        searchTo={effectiveDisplaySearchTo}
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
          <div className={styles["comments-page-toolbar-actions"]}>
            <button
              className={styles["report-open-button"]}
              type="button"
              onClick={() => {
                setIsReportModalOpen(true);
              }}
            >
              {t("report-modal.open-button")}
            </button>
            <CommentsPageCount
              hasLoadedStoredPosts={storedSelectedPosts !== null && isSearchReady}
              selectedPosts={validatedAppliedSelectedPosts}
              searchFrom={submittedSearchFrom}
              searchQuery={submittedSearchQuery}
              searchTo={submittedSearchTo}
              searchTrigger={searchTrigger}
            />
          </div>
        </div>
        <div
          aria-labelledby={`comments-${activeTab}-tab`}
          className={styles["comments-page-tab-panel"]}
          id={activeTabPanelId}
          role="tabpanel"
        >
          {activeTab === "chart" ? (
            <CommentsPageScatterChart
              hasLoadedStoredPosts={storedSelectedPosts !== null && isSearchReady}
              searchFrom={submittedSearchFrom}
              searchQuery={submittedSearchQuery}
              searchTo={submittedSearchTo}
              searchTrigger={searchTrigger}
              selectedPosts={validatedAppliedSelectedPosts}
            />
          ) : null}
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
          {activeTab === "upload" ? <CommentsUploadForm /> : null}
        </div>
        <ReportModal
          aiModels={aiModels}
          isOpen={isReportModalOpen}
          isSubmitting={isReportSubmitting}
          onClose={() => {
            setIsReportModalOpen(false);
          }}
          onSubmit={handleReportSubmit}
        />
      </div>
    </section>
  );
}
