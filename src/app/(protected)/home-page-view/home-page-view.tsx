"use client";

import { useTranslations } from "next-intl";

import { Stats } from "@/ui";

import styles from "../page.module.scss";

type CountStats = {
  today: number;
  total: number;
};

type HomePageViewProps = {
  commentsStats: CountStats;
  commentsToneAverageStats: CountStats;
  newsStats: CountStats;
  sourcesStats: CountStats;
};

export function HomePageView({
  commentsStats,
  commentsToneAverageStats,
  newsStats,
  sourcesStats,
}: HomePageViewProps) {
  const t = useTranslations();

  return (
    <section className={styles["home-page"]}>
      <Stats
        stats={[
          {
            title: t("home.news-title"),
            tooltip: t("home.news-tooltip"),
            value: newsStats,
          },
          {
            title: t("home.sources-title"),
            tooltip: t("home.sources-tooltip"),
            value: sourcesStats,
          },
          {
            title: t("home.comments-title"),
            tooltip: t("home.comments-tooltip"),
            value: commentsStats,
          },
          {
            title: t("home.comments-tone-average-title"),
            tooltip: t("home.comments-tone-average-tooltip"),
            value: commentsToneAverageStats,
          },
        ]}
      />
    </section>
  );
}
