"use client";

import type { SourceOptionItem } from "@/lib/sources/source-options";

import { NewsPageSearchForm } from "../news-page-search-form/news-page-search-form";

import styles from "./news-page-view.module.scss";

type NewsPageViewProps = {
  searchQuery: string;
  sources: SourceOptionItem[];
};

export function NewsPageView({ searchQuery, sources }: NewsPageViewProps) {
  return (
    <section className={styles["news-page"]}>
      <NewsPageSearchForm searchQuery={searchQuery} sources={sources} />
    </section>
  );
}
