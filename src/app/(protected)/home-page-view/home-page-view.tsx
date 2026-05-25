"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { HomePageChartRangeSelector, ReportSourcesBlock, ReportTrendChart } from "@/components/home";
import {
  isHomePageChartRange,
  setStoredHomePageChartRange,
  useStoredHomePageChartRange,
} from "@/components/home/home-page-chart-range/home-page-chart-range-storage";
import type {
  HomePageChartRange,
  HomePageReportTrendRangeStats,
} from "@/lib/home-page-stats";
import { routes } from "@/lib/routes";

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
  commentsChart: ReactNode;
  commentsValue: ReactNode;
  commentsToneAverageValue: ReactNode;
  newsChart: ReactNode;
  newsCountryChart: ReactNode;
  newsValue: ReactNode;
  reportItems: HomePageReportItem[];
  searchQuery: string;
  sourcesValue: ReactNode;
};

export function HomePageView({
  commentsChart,
  commentsValue,
  commentsToneAverageValue,
  newsChart,
  newsCountryChart,
  newsValue,
  reportItems,
  searchQuery,
  sourcesValue,
}: HomePageViewProps) {
  const t = useTranslations();
  const trendRange = useStoredHomePageChartRange(REPORT_TREND_CHART_RANGE_STORAGE);
  const reportsTableLabels = {
    keywords: t("home.reports-table-keywords-heading"),
    mobileTrendRange: t("home.reports-table-trend-mobile-range"),
    sources: t("home.reports-table-sources-heading"),
    title: t("home.reports-table-heading"),
    trend: t("home.reports-table-trend-heading"),
    trendRange: t("home.reports-table-trend-range-selector"),
  };

  return (
    <section className={styles["home-page"]}>
      <HomePageSearchResults
        key={searchQuery}
        searchQuery={searchQuery}
        stats={[
          {
            title: t("home.news-title"),
            tooltip: t("home.news-tooltip"),
            value: newsValue,
          },
          {
            title: t("home.sources-title"),
            tooltip: t("home.sources-tooltip"),
            value: sourcesValue,
          },
          {
            title: t("home.comments-title"),
            tooltip: t("home.comments-tooltip"),
            value: commentsValue,
          },
          {
            title: t("home.comments-tone-average-title"),
            tooltip: t("home.comments-tone-average-tooltip"),
            value: commentsToneAverageValue,
          },
        ]}
      >
        <div className={styles["home-page-charts"]}>
          <div className={styles["home-page-chart-slot"]}>{newsChart}</div>
          <div className={styles["home-page-chart-slot"]}>{newsCountryChart}</div>
          <div className={styles["home-page-chart-slot"]}>{commentsChart}</div>
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
