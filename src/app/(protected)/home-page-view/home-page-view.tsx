import { type ReactNode, Suspense } from "react";
import { getTranslations } from "next-intl/server";

import {
  CommentsBarChart,
  CommentsBarChartSkeleton,
  NewsBarChart,
  NewsBarChartSkeleton,
} from "@/components/home";
import type {
  CommentsChartRange,
  HomePageCommentsChartStats,
  HomePageNewsChartStats,
  NewsChartRange,
} from "@/lib/home-page-stats";

import { HomePageSearchResults } from "./home-page-search-results/home-page-search-results";

import styles from "../page.module.scss";

type HomePageViewProps = {
  commentsChartPromise: Promise<HomePageCommentsChartStats>;
  commentsValue: ReactNode;
  commentsToneAverageValue: ReactNode;
  newsChartPromise: Promise<HomePageNewsChartStats>;
  newsValue: ReactNode;
  searchQuery: string;
  sourcesValue: ReactNode;
};

export async function HomePageView({
  commentsChartPromise,
  commentsValue,
  commentsToneAverageValue,
  newsChartPromise,
  newsValue,
  searchQuery,
  sourcesValue,
}: HomePageViewProps) {
  const t = await getTranslations();
  const commentsChartRangeLabels: Record<CommentsChartRange, string> = {
    "all-time-monthly": t("home.comments-chart-ranges.all-time-monthly"),
    "month-daily": t("home.comments-chart-ranges.month-daily"),
    "six-months-weekly": t("home.comments-chart-ranges.six-months-weekly"),
  };
  const commentsChartSubtitles: Record<CommentsChartRange, string> = {
    "all-time-monthly": t("home.comments-chart-subtitles.all-time-monthly"),
    "month-daily": t("home.comments-chart-subtitles.month-daily"),
    "six-months-weekly": t("home.comments-chart-subtitles.six-months-weekly"),
  };
  const commentsChartEmptyLabels: Record<CommentsChartRange, string> = {
    "all-time-monthly": t("home.comments-chart-empty.all-time-monthly"),
    "month-daily": t("home.comments-chart-empty.month-daily"),
    "six-months-weekly": t("home.comments-chart-empty.six-months-weekly"),
  };
  const newsChartRangeLabels: Record<NewsChartRange, string> = {
    "all-time-monthly": t("home.news-chart-ranges.all-time-monthly"),
    "month-daily": t("home.news-chart-ranges.month-daily"),
    "six-months-weekly": t("home.news-chart-ranges.six-months-weekly"),
  };
  const newsChartSubtitles: Record<NewsChartRange, string> = {
    "all-time-monthly": t("home.news-chart-subtitles.all-time-monthly"),
    "month-daily": t("home.news-chart-subtitles.month-daily"),
    "six-months-weekly": t("home.news-chart-subtitles.six-months-weekly"),
  };
  const newsChartEmptyLabels: Record<NewsChartRange, string> = {
    "all-time-monthly": t("home.news-chart-empty.all-time-monthly"),
    "month-daily": t("home.news-chart-empty.month-daily"),
    "six-months-weekly": t("home.news-chart-empty.six-months-weekly"),
  };

  return (
    <section className={styles["home-page"]}>
      <HomePageSearchResults
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
          <div className={styles["home-page-chart-slot"]}>
            <Suspense fallback={<NewsBarChartSkeleton />}>
              <NewsChartFromPromise
                emptyLabels={newsChartEmptyLabels}
                promise={newsChartPromise}
                rangeLabels={newsChartRangeLabels}
                rangeSelectorLabel={t("home.news-chart-range-selector")}
                subtitles={newsChartSubtitles}
                title={t("home.news-chart-title")}
                totalLabel={t("home.news-chart-total-label")}
                unknownTypeLabel={t("home.news-chart-unknown-type")}
              />
            </Suspense>
          </div>
          <div className={styles["home-page-chart-slot"]}>
            <Suspense fallback={<CommentsBarChartSkeleton />}>
              <CommentsChartFromPromise
                emptyLabels={commentsChartEmptyLabels}
                rangeLabels={commentsChartRangeLabels}
                rangeSelectorLabel={t("home.comments-chart-range-selector")}
                promise={commentsChartPromise}
                subtitles={commentsChartSubtitles}
                title={t("home.comments-chart-title")}
                valueLabel={t("home.comments-chart-value-label")}
              />
            </Suspense>
          </div>
        </div>
      </HomePageSearchResults>
    </section>
  );
}

async function NewsChartFromPromise({
  emptyLabels,
  promise,
  rangeLabels,
  rangeSelectorLabel,
  subtitles,
  title,
  totalLabel,
  unknownTypeLabel,
}: {
  emptyLabels: Record<NewsChartRange, string>;
  promise: Promise<HomePageNewsChartStats>;
  rangeLabels: Record<NewsChartRange, string>;
  rangeSelectorLabel: string;
  subtitles: Record<NewsChartRange, string>;
  title: string;
  totalLabel: string;
  unknownTypeLabel: string;
}) {
  const stats = await promise;

  return (
    <NewsBarChart
      data={stats}
      emptyLabels={emptyLabels}
      rangeLabels={rangeLabels}
      rangeSelectorLabel={rangeSelectorLabel}
      subtitles={subtitles}
      title={title}
      totalLabel={totalLabel}
      unknownTypeLabel={unknownTypeLabel}
    />
  );
}

async function CommentsChartFromPromise({
  emptyLabels,
  rangeLabels,
  rangeSelectorLabel,
  promise,
  subtitles,
  title,
  valueLabel,
}: {
  emptyLabels: Record<CommentsChartRange, string>;
  promise: Promise<HomePageCommentsChartStats>;
  rangeLabels: Record<CommentsChartRange, string>;
  rangeSelectorLabel: string;
  subtitles: Record<CommentsChartRange, string>;
  title: string;
  valueLabel: string;
}) {
  const stats = await promise;

  return (
    <CommentsBarChart
      data={stats}
      emptyLabels={emptyLabels}
      rangeLabels={rangeLabels}
      rangeSelectorLabel={rangeSelectorLabel}
      subtitles={subtitles}
      title={title}
      valueLabel={valueLabel}
    />
  );
}
