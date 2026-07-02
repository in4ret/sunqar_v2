"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  CommentsBarChart,
  CommentsBarChartSkeleton,
  HomePageChartRangeSelector,
  NewsBarChart,
  NewsBarChartSkeleton,
  NewsCountryPieChart,
  NewsCountryPieChartSkeleton,
  ReportSourcesBlock,
  ReportTrendChart,
} from "@/components/home";
import {
  isHomePageChartRange,
  setStoredHomePageChartRange,
  useStoredHomePageChartRange,
} from "@/components/home/home-page-chart-range/home-page-chart-range-storage";
import type {
  HomePageChartRange,
  HomePageCommentsChartStats,
  HomePageCountStats,
  HomePageNewsChartStats,
  HomePageReportTrendRangeStats,
} from "@/lib/home-page-stats";
import type { HomePageNewsCountryChartStats } from "@/lib/home-page-stats-shared";
import { routes } from "@/lib/routes";
import { formatCompactNumber } from "@/lib/utils";
import { StatsValueSkeleton } from "@/ui";

import {
  getStoredHomePageSearchState,
  HOME_PAGE_SEARCH_STATE_STORAGE_CONFIG,
} from "./home-page-search-form/home-page-search-form-storage";
import { HomePageSearchResults } from "./home-page-search-results/home-page-search-results";

import styles from "../page.module.scss";

const REPORT_TREND_CHART_RANGE_STORAGE = {
  changeEventName: "sunqar-home-reports-trend-chart-range-change",
  storageKey: "sunqar-home-reports-trend-chart-range",
} as const;

type HomePageReportItem = {
  blockKeywords: string[];
  blockSources: string[][];
  id: string;
  ranges: {
    [key in HomePageChartRange]: HomePageReportTrendRangeStats;
  };
  title: string;
};

type HomePageViewProps = {
  reportItems: HomePageReportItem[];
  searchQuery: string;
};

type HomePageSearchResponse = {
  commentsChart: HomePageCommentsChartStats;
  commentsToneAverageValue: HomePageCountStats;
  commentsValue: HomePageCountStats;
  newsChart: HomePageNewsChartStats;
  newsCountryChart: HomePageNewsCountryChartStats;
  newsValue: HomePageCountStats;
  sourcesValue: HomePageCountStats;
};

type HomePageSearchDataState =
  | { status: "loading" }
  | { data: HomePageSearchResponse; query: string; status: "success" }
  | { query: string; status: "error" };

function formatStatsValue(total: number, today: number) {
  return `${formatCompactNumber(total)} | ${formatCompactNumber(today)}`;
}

function isHomePageCountStats(value: unknown): value is HomePageCountStats {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Partial<HomePageCountStats>).total === "number" &&
    typeof (value as Partial<HomePageCountStats>).today === "number"
  );
}

function isHomePageSearchResponse(value: unknown): value is HomePageSearchResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<HomePageSearchResponse>;

  return (
    isHomePageCountStats(response.commentsToneAverageValue) &&
    isHomePageCountStats(response.commentsValue) &&
    isHomePageCountStats(response.newsValue) &&
    isHomePageCountStats(response.sourcesValue) &&
    !!response.commentsChart &&
    typeof response.commentsChart === "object" &&
    Array.isArray(response.commentsChart.sources) &&
    !!response.newsChart &&
    typeof response.newsChart === "object" &&
    Array.isArray(response.newsChart.types) &&
    !!response.newsCountryChart &&
    typeof response.newsCountryChart === "object" &&
    Array.isArray(response.newsCountryChart.slices)
  );
}

function buildStatsItems(
  t: ReturnType<typeof useTranslations>,
  searchDataState: HomePageSearchDataState,
) {
  if (searchDataState.status !== "success") {
    return [
      {
        title: t("home.news-title"),
        tooltip: t("home.news-tooltip"),
        value: <StatsValueSkeleton />,
      },
      {
        title: t("home.sources-title"),
        tooltip: t("home.sources-tooltip"),
        value: <StatsValueSkeleton />,
      },
      {
        title: t("home.comments-title"),
        tooltip: t("home.comments-tooltip"),
        value: <StatsValueSkeleton />,
      },
      {
        title: t("home.comments-tone-average-title"),
        tooltip: t("home.comments-tone-average-tooltip"),
        value: <StatsValueSkeleton />,
      },
    ];
  }

  return [
    {
      title: t("home.news-title"),
      tooltip: t("home.news-tooltip"),
      value: formatStatsValue(searchDataState.data.newsValue.total, searchDataState.data.newsValue.today),
    },
    {
      title: t("home.sources-title"),
      tooltip: t("home.sources-tooltip"),
      value: formatStatsValue(searchDataState.data.sourcesValue.total, searchDataState.data.sourcesValue.today),
    },
    {
      title: t("home.comments-title"),
      tooltip: t("home.comments-tooltip"),
      value: formatStatsValue(searchDataState.data.commentsValue.total, searchDataState.data.commentsValue.today),
    },
    {
      title: t("home.comments-tone-average-title"),
      tooltip: t("home.comments-tone-average-tooltip"),
      value: formatStatsValue(
        searchDataState.data.commentsToneAverageValue.total,
        searchDataState.data.commentsToneAverageValue.today,
      ),
    },
  ];
}

export function HomePageView({
  reportItems,
  searchQuery,
}: HomePageViewProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const trendRange = useStoredHomePageChartRange(REPORT_TREND_CHART_RANGE_STORAGE);
  const [searchDataState, setSearchDataState] = useState<HomePageSearchDataState>({ status: "loading" });
  const hasSearchParams = searchParams.has("q");
  const storedSearchState = hasSearchParams
    ? null
    : getStoredHomePageSearchState(HOME_PAGE_SEARCH_STATE_STORAGE_CONFIG);
  const hasStoredSearchStateToRestore = !hasSearchParams && !!storedSearchState?.searchQuery;
  const isSearchStateResolved = hasSearchParams || !hasStoredSearchStateToRestore;
  const reportsTableLabels = {
    keywords: t("home.reports-table-keywords-heading"),
    mobileTrendRange: t("home.reports-table-trend-mobile-range"),
    sources: t("home.reports-table-sources-heading"),
    title: t("home.reports-table-heading"),
    trend: t("home.reports-table-trend-heading"),
    trendRange: t("home.reports-table-trend-range-selector"),
  };
  const effectiveSearchDataState = useMemo<HomePageSearchDataState>(
    () =>
      isSearchStateResolved &&
      searchDataState.status === "success" &&
      searchDataState.query === searchQuery
        ? searchDataState
        : { status: "loading" },
    [isSearchStateResolved, searchDataState, searchQuery],
  );
  const stats = useMemo(() => buildStatsItems(t, effectiveSearchDataState), [effectiveSearchDataState, t]);
  const shouldShowLoadedSearchData =
    isSearchStateResolved &&
    searchDataState.status === "success" &&
    searchDataState.query === searchQuery;

  useEffect(() => {
    if (!hasStoredSearchStateToRestore || !storedSearchState) {
      return;
    }

    const nextUrl = new URL(routes.home, window.location.origin);

    nextUrl.searchParams.set("q", storedSearchState.searchQuery);
    router.replace(`${nextUrl.pathname}${nextUrl.search}`);
  }, [hasStoredSearchStateToRestore, router, storedSearchState]);

  useEffect(() => {
    if (!isSearchStateResolved) {
      return;
    }

    const abortController = new AbortController();

    async function loadSearchData() {
      setSearchDataState({ status: "loading" });

      try {
        const response = await fetch("/api/home/search", {
          body: JSON.stringify({
            query: searchQuery,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as unknown;

        if (!isHomePageSearchResponse(payload)) {
          throw new Error("Response payload is invalid.");
        }

        setSearchDataState({
          data: payload,
          query: searchQuery,
          status: "success",
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setSearchDataState({ query: searchQuery, status: "error" });
      }
    }

    void loadSearchData();

    return () => {
      abortController.abort();
    };
  }, [isSearchStateResolved, searchQuery]);

  return (
    <section className={styles["home-page"]}>
      <HomePageSearchResults key={searchQuery} searchQuery={searchQuery} stats={stats}>
        <div className={styles["home-page-charts"]}>
          <div className={styles["home-page-chart-slot"]}>
            {shouldShowLoadedSearchData ? (
              <NewsBarChart data={searchDataState.data.newsChart} />
            ) : (
              <NewsBarChartSkeleton />
            )}
          </div>
          <div className={styles["home-page-chart-slot"]}>
            {shouldShowLoadedSearchData ? (
              <NewsCountryPieChart data={searchDataState.data.newsCountryChart} />
            ) : (
              <NewsCountryPieChartSkeleton />
            )}
          </div>
          <div className={styles["home-page-chart-slot"]}>
            {shouldShowLoadedSearchData ? (
              <CommentsBarChart data={searchDataState.data.commentsChart} />
            ) : (
              <CommentsBarChartSkeleton />
            )}
          </div>
        </div>
        <div className={styles["home-page-reports-card"]}>
          {reportItems.length > 0 ? (
            <>
              <div className={styles["home-page-reports-mobile-toolbar"]}>
                <span className={styles["home-page-reports-mobile-toolbar-label"]}>
                  {reportsTableLabels.mobileTrendRange}
                </span>
                <HomePageChartRangeSelector
                  aria-label={reportsTableLabels.trendRange}
                  value={trendRange}
                  onChange={(nextValue) => {
                    if (isHomePageChartRange(nextValue)) {
                      setStoredHomePageChartRange(REPORT_TREND_CHART_RANGE_STORAGE, nextValue);
                    }
                  }}
                />
              </div>
              <div className={styles["home-page-reports-table-shell"]}>
                <table className={styles["home-page-reports-table"]}>
                  <thead>
                    <tr>
                      <th className={styles["home-page-report-title-column"]}>
                        {reportsTableLabels.title}
                      </th>
                      <th className={styles["home-page-report-keywords-column"]}>
                        {reportsTableLabels.keywords}
                      </th>
                      <th className={styles["home-page-report-trend-heading"]}>
                        <span>{reportsTableLabels.trend}</span>
                        <HomePageChartRangeSelector
                          aria-label={reportsTableLabels.trendRange}
                          value={trendRange}
                          onChange={(nextValue) => {
                            if (isHomePageChartRange(nextValue)) {
                              setStoredHomePageChartRange(
                                REPORT_TREND_CHART_RANGE_STORAGE,
                                nextValue
                              );
                            }
                          }}
                        />
                      </th>
                      <th className={styles["home-page-report-sources-column"]}>{reportsTableLabels.sources}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportItems.map((report) => (
                      <tr key={report.id}>
                        <td
                          className={styles["home-page-report-title-column"]}
                          data-label={reportsTableLabels.title}
                        >
                          <Link className={styles["home-page-report-link"]} href={routes.reports}>
                            {report.title}
                          </Link>
                        </td>
                        <td
                          className={styles["home-page-report-keywords-column"]}
                          data-label={reportsTableLabels.keywords}
                        >
                          {report.blockKeywords.length > 0 ? (
                            <ul className={styles["home-page-report-keywords-list"]}>
                              {report.blockKeywords.map((keywords, index) =>
                                keywords ? (
                                  <li
                                    className={styles["home-page-report-keywords-item"]}
                                    data-legend-color={index % 3}
                                    key={`${report.id}-keywords-${index}`}
                                  >
                                    <span
                                      className={styles["home-page-report-keywords-bullet"]}
                                      aria-hidden="true"
                                    />
                                    <span>{keywords}</span>
                                  </li>
                                ) : null
                              )}
                            </ul>
                          ) : null}
                        </td>
                        <td
                          className={styles["home-page-report-trend-cell"]}
                          data-label={reportsTableLabels.trend}
                        >
                          <ReportTrendChart
                            range={trendRange}
                            ranges={report.ranges}
                            reportTitle={report.title}
                          />
                        </td>
                        <td data-label={reportsTableLabels.sources}>
                          {report.blockSources.length > 0 ? (
                            <ul className={styles["home-page-report-sources-list"]}>
                              {report.blockSources.map((sources, index) =>
                                sources.length > 0 ? (
                                  <ReportSourcesBlock
                                    key={`${report.id}-sources-${index}`}
                                    legendColor={index % 3}
                                    sources={sources}
                                  />
                                ) : null
                              )}
                            </ul>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className={styles["home-page-reports-empty"]}>{t("reports.empty")}</p>
          )}
        </div>
      </HomePageSearchResults>
    </section>
  );
}
