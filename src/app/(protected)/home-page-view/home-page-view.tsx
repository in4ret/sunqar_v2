import { type ReactNode, Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { CommentsBarChart, CommentsBarChartSkeleton } from "@/components/home";
import type { CommentsChartRange, HomePageCommentsChartStats } from "@/lib/home-page-stats";

import { HomePageSearchResults } from "./home-page-search-results/home-page-search-results";

import styles from "../page.module.scss";

type HomePageViewProps = {
  commentsChartPromise: Promise<HomePageCommentsChartStats>;
  commentsValue: ReactNode;
  commentsToneAverageValue: ReactNode;
  newsValue: ReactNode;
  searchQuery: string;
  sourcesValue: ReactNode;
};

export async function HomePageView({
  commentsChartPromise,
  commentsValue,
  commentsToneAverageValue,
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
