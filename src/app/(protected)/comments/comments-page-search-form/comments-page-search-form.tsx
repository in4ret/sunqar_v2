"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { CommentsTab } from "@/lib/routes";
import { getCommentsTabRoute } from "@/lib/routes";
import {
  formatDateTimeLocalValueToEpochSeconds,
  normalizeDateTimeLocalValue,
  normalizeSearchQuery,
} from "@/lib/utils";
import { MultiSelect, type MultiSelectOption, SearchInput } from "@/ui";

import {
  COMMENTS_PAGE_SEARCH_FORM_STORAGE_CONFIG,
  setStoredCommentsPagePosts,
} from "./comments-page-search-form-storage";

import styles from "./comments-page-search-form.module.scss";

type CommentsPageSearchFormProps = {
  activeTab: CommentsTab;
  availablePostValues: string[];
  onSearchChangeStateChange: (isDirty: boolean) => void;
  onSearchSubmit: (input: {
    searchFrom: string;
    searchQuery: string;
    searchTo: string;
    selectedPosts: string[];
  }) => void;
  initialSelectedPosts: string[];
  postOptions: MultiSelectOption[];
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
};

const COMMENTS_PAGE_FROM_INPUT_NAME = "sunqar-comments-from";
const COMMENTS_PAGE_POSTS_INPUT_NAME = "sunqar-comments-posts";
const COMMENTS_PAGE_SEARCH_INPUT_NAME = "sunqar-comments-search-query";
const COMMENTS_PAGE_TO_INPUT_NAME = "sunqar-comments-to";

export function CommentsPageSearchForm({
  activeTab,
  availablePostValues,
  onSearchChangeStateChange,
  onSearchSubmit,
  initialSelectedPosts,
  postOptions,
  searchFrom,
  searchQuery,
  searchTo,
}: CommentsPageSearchFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [fromValue, setFromValue] = useState(searchFrom);
  const [toValue, setToValue] = useState(searchTo);
  const [value, setValue] = useState(searchQuery);
  const [selectedPosts, setSelectedPosts] = useState(initialSelectedPosts);
  const availablePostValuesSet = useMemo(() => new Set(availablePostValues), [availablePostValues]);
  const validatedSelectedPosts = useMemo(
    () => selectedPosts.filter((post) => availablePostValuesSet.has(post)),
    [availablePostValuesSet, selectedPosts],
  );
  const normalizedAppliedSelectedPosts = useMemo(
    () => initialSelectedPosts.filter((post) => availablePostValuesSet.has(post)),
    [availablePostValuesSet, initialSelectedPosts],
  );
  const isDirty =
    fromValue !== searchFrom ||
    toValue !== searchTo ||
    value !== searchQuery ||
    JSON.stringify(validatedSelectedPosts) !== JSON.stringify(normalizedAppliedSelectedPosts);

  useEffect(() => {
    onSearchChangeStateChange(isDirty);
  }, [isDirty, onSearchChangeStateChange]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const formFromValue = formData.get(COMMENTS_PAGE_FROM_INPUT_NAME);
    const formValue = formData.get(COMMENTS_PAGE_SEARCH_INPUT_NAME);
    const formToValue = formData.get(COMMENTS_PAGE_TO_INPUT_NAME);
    const nextSearchFrom = normalizeDateTimeLocalValue(
      typeof formFromValue === "string" ? formFromValue : "",
    );
    const nextSearchQuery = normalizeSearchQuery(typeof formValue === "string" ? formValue : "");
    const nextSearchTo = normalizeDateTimeLocalValue(typeof formToValue === "string" ? formToValue : "");
    const nextSearchFromEpochSeconds = formatDateTimeLocalValueToEpochSeconds(nextSearchFrom);
    const nextSearchToEpochSeconds = formatDateTimeLocalValueToEpochSeconds(nextSearchTo);
    const nextUrl = new URL(getCommentsTabRoute(activeTab), window.location.origin);

    if (nextSearchFromEpochSeconds) {
      nextUrl.searchParams.set("from", nextSearchFromEpochSeconds);
    }

    if (nextSearchQuery) {
      nextUrl.searchParams.set("q", nextSearchQuery);
    }

    if (nextSearchToEpochSeconds) {
      nextUrl.searchParams.set("to", nextSearchToEpochSeconds);
    }

    setStoredCommentsPagePosts(COMMENTS_PAGE_SEARCH_FORM_STORAGE_CONFIG, validatedSelectedPosts);
    onSearchChangeStateChange(false);
    onSearchSubmit({
      selectedPosts: validatedSelectedPosts,
      searchFrom: nextSearchFromEpochSeconds,
      searchQuery: nextSearchQuery,
      searchTo: nextSearchToEpochSeconds,
    });

    router.push(`${nextUrl.pathname}${nextUrl.search}`);
  }

  return (
    <form
      action={getCommentsTabRoute(activeTab)}
      className={styles["comments-page-search-form"]}
      method="get"
      onSubmit={handleSubmit}
    >
      <label className={styles["comments-page-search-field"]}>
        <span className={styles["comments-page-field-label"]}>{t("comments.search-label")}</span>
        <SearchInput
          clearLabel={t("home.search-clear")}
          name={COMMENTS_PAGE_SEARCH_INPUT_NAME}
          onChange={setValue}
          placeholder={t("home.search-placeholder")}
          value={value}
        />
      </label>
      <label className={styles["comments-page-date-field"]}>
        <span className={styles["comments-page-field-label"]}>{t("comments.from-label")}</span>
        <input
          className={styles["comments-page-date-input"]}
          name={COMMENTS_PAGE_FROM_INPUT_NAME}
          onChange={(event) => setFromValue(event.currentTarget.value)}
          type="datetime-local"
          value={fromValue}
        />
      </label>
      <label className={styles["comments-page-date-field"]}>
        <span className={styles["comments-page-field-label"]}>{t("comments.to-label")}</span>
        <input
          className={styles["comments-page-date-input"]}
          name={COMMENTS_PAGE_TO_INPUT_NAME}
          onChange={(event) => setToValue(event.currentTarget.value)}
          type="datetime-local"
          value={toValue}
        />
      </label>
      <div className={styles["comments-page-posts-field"]}>
        <span className={styles["comments-page-field-label"]}>{t("comments.posts-label")}</span>
        <MultiSelect
          aria-label={t("comments.posts-label")}
          emptyLabel={t("comments.posts-empty")}
          name={COMMENTS_PAGE_POSTS_INPUT_NAME}
          onChange={setSelectedPosts}
          options={postOptions}
          placeholder={t("comments.posts-placeholder")}
          removeButtonLabel={(label) => t("comments.remove-selected-post", { post: label })}
          selectedItemsModalCloseLabel={t("comments.selected-posts-modal-close")}
          selectedItemsModalTitle={t("comments.selected-posts-modal-title")}
          showAllSelectedLabel={(count) => t("comments.show-all-selected-posts", { count })}
          value={validatedSelectedPosts}
          visibleSelectedOptionsCount={5}
        />
      </div>
      <button className={styles["comments-page-search-submit"]} type="submit">
        {t("home.search-submit")}
      </button>
    </form>
  );
}
