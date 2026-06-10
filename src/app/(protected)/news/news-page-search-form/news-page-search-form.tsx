"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { routes } from "@/lib/routes";
import { buildSourceOptions, type SourceOptionItem } from "@/lib/sources/source-options";
import { normalizeSearchQuery } from "@/lib/utils";
import { MultiSelect, SearchInput } from "@/ui";

import styles from "./news-page-search-form.module.scss";

type NewsPageSearchFormProps = {
  searchQuery: string;
  sources: SourceOptionItem[];
};

const NEWS_PAGE_SEARCH_INPUT_NAME = "sunqar-news-search-query";
const NEWS_PAGE_SOURCES_INPUT_NAME = "sunqar-news-sources";
const NEWS_PAGE_SOURCES_STORAGE_KEY = "sunqar-news-sources";

function getStoredNewsPageSources() {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(NEWS_PAGE_SOURCES_STORAGE_KEY);

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function NewsPageSearchForm({ searchQuery, sources }: NewsPageSearchFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [value, setValue] = useState(searchQuery);
  const [selectedSources, setSelectedSources] = useState<string[]>(() => getStoredNewsPageSources());
  const sourceOptions = useMemo(
    () =>
      buildSourceOptions({
        sources,
        withoutCountryLabel: t("reports.form.sources-without-country"),
        withoutTypeLabel: t("reports.form.sources-without-type"),
      }),
    [sources, t],
  );
  const availableSourceValues = useMemo(
    () => new Set(sources.map((source) => source.name)),
    [sources],
  );
  const validatedSelectedSources = useMemo(
    () => selectedSources.filter((source) => availableSourceValues.has(source)),
    [availableSourceValues, selectedSources],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const formValue = formData.get(NEWS_PAGE_SEARCH_INPUT_NAME);
    const nextSearchQuery = normalizeSearchQuery(typeof formValue === "string" ? formValue : "");
    const nextUrl = new URL(routes.news, window.location.origin);

    if (nextSearchQuery) {
      nextUrl.searchParams.set("q", nextSearchQuery);
    }

    window.localStorage.setItem(
      NEWS_PAGE_SOURCES_STORAGE_KEY,
      JSON.stringify(validatedSelectedSources),
    );

    router.push(`${nextUrl.pathname}${nextUrl.search}`);
  }

  return (
    <form
      action={routes.news}
      className={styles["news-page-search-form"]}
      method="get"
      onSubmit={handleSubmit}
    >
      <SearchInput
        clearLabel={t("home.search-clear")}
        name={NEWS_PAGE_SEARCH_INPUT_NAME}
        onChange={setValue}
        placeholder={t("home.search-placeholder")}
        value={value}
      />
      <div className={styles["news-page-sources-field"]}>
        <span className={styles["news-page-sources-label"]}>{t("reports.form.block-sources")}</span>
        <MultiSelect
          aria-label={t("reports.form.block-sources")}
          emptyLabel={t("reports.form.block-sources-empty")}
          name={NEWS_PAGE_SOURCES_INPUT_NAME}
          onChange={setSelectedSources}
          options={sourceOptions}
          placeholder={t("reports.form.block-sources-placeholder")}
          removeButtonLabel={(label) => t("reports.form.remove-selected-source", { source: label })}
          selectedItemsModalCloseLabel={t("reports.form.selected-sources-modal-close")}
          selectedItemsModalTitle={t("reports.form.selected-sources-modal-title")}
          showAllSelectedLabel={(count) => t("reports.form.show-all-selected-sources", { count })}
          value={validatedSelectedSources}
          visibleSelectedOptionsCount={5}
        />
      </div>
      <button className={styles["news-page-search-submit"]} type="submit">
        {t("home.search-submit")}
      </button>
    </form>
  );
}
