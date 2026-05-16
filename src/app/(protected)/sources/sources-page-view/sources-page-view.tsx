"use client";

import { useTranslations } from "next-intl";

import { SourceManager } from "@/components/sources";

import styles from "../page.module.scss";

type SourceView = {
  id: string;
  name: string;
};

type SourcesPageViewProps = {
  allSources: SourceView[];
};

export function SourcesPageView({ allSources }: SourcesPageViewProps) {
  const t = useTranslations();

  return (
    <section className={styles["sources-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles["eyebrow"]}>{t("sources.eyebrow")}</p>
          <h1 className={styles["title"]}>{t("sources.title")}</h1>
          <p className={styles["description"]}>{t("sources.description")}</p>
        </div>
      </div>
      <SourceManager sources={allSources} />
    </section>
  );
}
