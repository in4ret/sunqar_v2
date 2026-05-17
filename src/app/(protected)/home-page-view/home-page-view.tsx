import { type ReactNode,Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { CommentsBarChart, CommentsBarChartSkeleton } from "@/components/home";
import type { HomePageCommentsDailyStat } from "@/lib/home-page-stats";

import { HomePageSearchResults } from "./home-page-search-results/home-page-search-results";

import styles from "../page.module.scss";

type HomePageViewProps = {
  commentsChartPromise: Promise<HomePageCommentsDailyStat[]>;
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
                emptyLabel={t("home.comments-chart-empty")}
                promise={commentsChartPromise}
                subtitle={t("home.comments-chart-subtitle")}
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
  emptyLabel,
  promise,
  subtitle,
  title,
  valueLabel,
}: {
  emptyLabel: string;
  promise: Promise<HomePageCommentsDailyStat[]>;
  subtitle: string;
  title: string;
  valueLabel: string;
}) {
  const stats = await promise;

  return (
    <CommentsBarChart
      data={stats}
      emptyLabel={emptyLabel}
      subtitle={subtitle}
      title={title}
      valueLabel={valueLabel}
    />
  );
}
