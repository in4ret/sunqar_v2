import { getTranslations } from "next-intl/server";

import type { ReactNode } from "react";

import { Stats } from "@/ui";

import styles from "../page.module.scss";

type HomePageViewProps = {
  commentsValue: ReactNode;
  commentsToneAverageValue: ReactNode;
  newsValue: ReactNode;
  sourcesValue: ReactNode;
};

export async function HomePageView({
  commentsValue,
  commentsToneAverageValue,
  newsValue,
  sourcesValue,
}: HomePageViewProps) {
  const t = await getTranslations();

  return (
    <section className={styles["home-page"]}>
      <Stats
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
      />
    </section>
  );
}
