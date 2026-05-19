"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { HomePageSearchResults } from "./home-page-search-results/home-page-search-results";

import styles from "../page.module.scss";

type HomePageViewProps = {
  commentsChart: ReactNode;
  commentsValue: ReactNode;
  commentsToneAverageValue: ReactNode;
  newsChart: ReactNode;
  newsValue: ReactNode;
  searchQuery: string;
  sourcesValue: ReactNode;
};

export function HomePageView({
  commentsChart,
  commentsValue,
  commentsToneAverageValue,
  newsChart,
  newsValue,
  searchQuery,
  sourcesValue,
}: HomePageViewProps) {
  const t = useTranslations();

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
          <div className={styles["home-page-chart-slot"]}>{newsChart}</div>
          <div className={styles["home-page-chart-slot"]}>{commentsChart}</div>
        </div>
      </HomePageSearchResults>
    </section>
  );
}
