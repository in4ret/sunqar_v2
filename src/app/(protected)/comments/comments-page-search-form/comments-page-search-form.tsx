"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { buildCommentPostOptions } from "@/lib/comments/comments-post-options";
import { routes } from "@/lib/routes";
import {
  formatDateTimeLocalValueToEpochSeconds,
  normalizeDateTimeLocalValue,
  normalizeSearchQuery,
} from "@/lib/utils";
import { MultiSelect, SearchInput } from "@/ui";

import {
  COMMENTS_PAGE_SEARCH_FORM_STORAGE_CONFIG,
  setStoredCommentsPagePosts,
} from "./comments-page-search-form-storage";

import styles from "./comments-page-search-form.module.scss";

type CommentPostOptionItem = {
  channel: string;
  channelName: string | null;
  contentId: string;
  contentTitle: string | null;
  source: string;
};

type CommentsPageSearchFormProps = {
  onSearchSubmit: (input: { searchFrom: string; searchQuery: string; searchTo: string }) => void;
  posts: CommentPostOptionItem[];
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
  selectedPosts: string[];
  setSelectedPosts: (posts: string[]) => void;
};

const COMMENTS_PAGE_FROM_INPUT_NAME = "sunqar-comments-from";
const COMMENTS_PAGE_POSTS_INPUT_NAME = "sunqar-comments-posts";
const COMMENTS_PAGE_SEARCH_INPUT_NAME = "sunqar-comments-search-query";
const COMMENTS_PAGE_TO_INPUT_NAME = "sunqar-comments-to";

export function CommentsPageSearchForm({
  onSearchSubmit,
  posts,
  searchFrom,
  searchQuery,
  searchTo,
  selectedPosts,
  setSelectedPosts,
}: CommentsPageSearchFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [fromValue, setFromValue] = useState(searchFrom);
  const [toValue, setToValue] = useState(searchTo);
  const [value, setValue] = useState(searchQuery);
  const postOptions = useMemo(
    () =>
      buildCommentPostOptions({
        emptyValue: "—",
        posts,
      }),
    [posts],
  );
  const availablePostValues = useMemo(() => {
    const values = new Set<string>();

    function collectValues(options: ReturnType<typeof buildCommentPostOptions>) {
      for (const option of options) {
        if (option.children && option.children.length > 0) {
          collectValues(option.children);
          continue;
        }

        values.add(option.value);
      }
    }

    collectValues(postOptions);

    return values;
  }, [postOptions]);
  const validatedSelectedPosts = useMemo(
    () => selectedPosts.filter((post) => availablePostValues.has(post)),
    [availablePostValues, selectedPosts],
  );

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
    const nextUrl = new URL(routes.comments, window.location.origin);

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
    onSearchSubmit({
      searchFrom: nextSearchFromEpochSeconds,
      searchQuery: nextSearchQuery,
      searchTo: nextSearchToEpochSeconds,
    });

    router.push(`${nextUrl.pathname}${nextUrl.search}`);
  }

  return (
    <form
      action={routes.comments}
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
          onChange={(nextValue) => {
            setSelectedPosts(nextValue);
          }}
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
