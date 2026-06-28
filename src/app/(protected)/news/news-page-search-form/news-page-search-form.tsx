"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { getNewsTabRoute, type NewsTab } from "@/lib/routes";
import { buildSourceOptions, type SourceOptionItem } from "@/lib/sources/source-options";
import {
  formatDateTimeLocalValueToEpochSeconds,
  normalizeDateTimeLocalValue,
  normalizeSearchQuery,
} from "@/lib/utils";
import { MultiSelect, SearchInput } from "@/ui";

import {
  NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG,
  setStoredNewsPageSources,
} from "./news-page-search-form-storage";

import styles from "./news-page-search-form.module.scss";

type NewsPageSearchFormProps = {
  activeTab: NewsTab;
  onSearchSubmit: (input: { searchFrom: string; searchQuery: string; searchTo: string }) => void;
  searchFrom: string;
  selectedSources: string[];
  searchQuery: string;
  searchTo: string;
  setSelectedSources: (sources: string[]) => void;
  sources: SourceOptionItem[];
};

const NEWS_PAGE_FROM_INPUT_NAME = "sunqar-news-from";
const NEWS_PAGE_SEARCH_INPUT_NAME = "sunqar-news-search-query";
const NEWS_PAGE_SOURCES_INPUT_NAME = "sunqar-news-sources";
const NEWS_PAGE_TO_INPUT_NAME = "sunqar-news-to";

export function NewsPageSearchForm({
  activeTab,
  onSearchSubmit,
  searchFrom,
  searchQuery,
  searchTo,
  selectedSources,
  setSelectedSources,
  sources,
}: NewsPageSearchFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [fromValue, setFromValue] = useState(searchFrom);
  const [toValue, setToValue] = useState(searchTo);
  const [value, setValue] = useState(searchQuery);
  const sourceOptions = useMemo(
    () =>
      buildSourceOptions({
        locale,
        sources,
        withoutCountryLabel: t("reports.form.sources-without-country"),
        withoutTypeLabel: t("reports.form.sources-without-type"),
      }),
    [locale, sources, t],
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
    const formFromValue = formData.get(NEWS_PAGE_FROM_INPUT_NAME);
    const formValue = formData.get(NEWS_PAGE_SEARCH_INPUT_NAME);
    const formToValue = formData.get(NEWS_PAGE_TO_INPUT_NAME);
    const nextSearchFrom = normalizeDateTimeLocalValue(
      typeof formFromValue === "string" ? formFromValue : "",
    );
    const nextSearchQuery = normalizeSearchQuery(typeof formValue === "string" ? formValue : "");
    const nextSearchTo = normalizeDateTimeLocalValue(typeof formToValue === "string" ? formToValue : "");
    const nextSearchFromEpochSeconds = formatDateTimeLocalValueToEpochSeconds(nextSearchFrom);
    const nextSearchToEpochSeconds = formatDateTimeLocalValueToEpochSeconds(nextSearchTo);
    const nextUrl = new URL(getNewsTabRoute(activeTab), window.location.origin);

    if (nextSearchFromEpochSeconds) {
      nextUrl.searchParams.set("from", nextSearchFromEpochSeconds);
    }

    if (nextSearchQuery) {
      nextUrl.searchParams.set("q", nextSearchQuery);
    }

    if (nextSearchToEpochSeconds) {
      nextUrl.searchParams.set("to", nextSearchToEpochSeconds);
    }

    setStoredNewsPageSources(NEWS_PAGE_SEARCH_FORM_STORAGE_CONFIG, validatedSelectedSources);
    onSearchSubmit({
      searchFrom: nextSearchFromEpochSeconds,
      searchQuery: nextSearchQuery,
      searchTo: nextSearchToEpochSeconds,
    });

    router.push(`${nextUrl.pathname}${nextUrl.search}`);
  }

  return (
    <form
      action={getNewsTabRoute(activeTab)}
      className={styles["news-page-search-form"]}
      method="get"
      onSubmit={handleSubmit}
    >
      <label className={styles["news-page-search-field"]}>
        <span className={styles["news-page-field-label"]}>{t("news.search-label")}</span>
        <SearchInput
          clearLabel={t("home.search-clear")}
          name={NEWS_PAGE_SEARCH_INPUT_NAME}
          onChange={setValue}
          placeholder={t("home.search-placeholder")}
          value={value}
        />
      </label>
      <label className={styles["news-page-date-field"]}>
        <span className={styles["news-page-field-label"]}>{t("news.from-label")}</span>
        <input
          className={styles["news-page-date-input"]}
          name={NEWS_PAGE_FROM_INPUT_NAME}
          onChange={(event) => setFromValue(event.currentTarget.value)}
          type="datetime-local"
          value={fromValue}
        />
      </label>
      <label className={styles["news-page-date-field"]}>
        <span className={styles["news-page-field-label"]}>{t("news.to-label")}</span>
        <input
          className={styles["news-page-date-input"]}
          name={NEWS_PAGE_TO_INPUT_NAME}
          onChange={(event) => setToValue(event.currentTarget.value)}
          type="datetime-local"
          value={toValue}
        />
      </label>
      <div className={styles["news-page-sources-field"]}>
        <span className={styles["news-page-field-label"]}>{t("reports.form.block-sources")}</span>
        <MultiSelect
          aria-label={t("reports.form.block-sources")}
          emptyLabel={t("reports.form.block-sources-empty")}
          name={NEWS_PAGE_SOURCES_INPUT_NAME}
          onChange={(nextValue) => {
            setSelectedSources(nextValue);
          }}
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
