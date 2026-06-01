"use client";

import { SourceManager } from "@/components/sources";

import styles from "../page.module.scss";

type SourceOption = {
  label: string;
  value: string;
};

type SourceView = {
  country: string | null;
  id: string;
  name: string;
  type: string | null;
};

type SourcesPageViewProps = {
  allSources: SourceView[];
  countryOptions: SourceOption[];
  typeOptions: SourceOption[];
};

export function SourcesPageView({
  allSources,
  countryOptions,
  typeOptions,
}: SourcesPageViewProps) {
  return (
    <section className={styles["sources-page"]}>
      <section className={styles["source-list-section"]}>
        <SourceManager
          countryOptions={countryOptions}
          sources={allSources}
          typeOptions={typeOptions}
        />
      </section>
    </section>
  );
}
