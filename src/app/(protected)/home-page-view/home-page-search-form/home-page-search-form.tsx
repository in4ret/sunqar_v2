"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { routes } from "@/lib/routes";
import { normalizeSearchQuery } from "@/lib/utils";
import { SearchInput } from "@/ui";

import styles from "../../page.module.scss";

type HomePageSearchFormProps = {
  onSearchDirtyChange?: (isDirty: boolean) => void;
  searchQuery: string;
};

const HOME_PAGE_SEARCH_INPUT_NAME = "sunqar-home-search-query";

export function HomePageSearchForm({
  onSearchDirtyChange,
  searchQuery,
}: HomePageSearchFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [value, setValue] = useState(searchQuery);

  function handleChange(nextValue: string) {
    setValue(nextValue);
    onSearchDirtyChange?.(nextValue !== searchQuery);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const value = formData.get(HOME_PAGE_SEARCH_INPUT_NAME);
    const searchValue = normalizeSearchQuery(typeof value === "string" ? value : "");
    const nextUrl = new URL(routes.home, window.location.origin);

    if (searchValue) {
      nextUrl.searchParams.set("q", searchValue);
    }

    router.push(`${nextUrl.pathname}${nextUrl.search}`);
  }

  return (
    <form
      action={routes.home}
      className={styles["home-page-search-form"]}
      method="get"
      onSubmit={handleSubmit}
    >
      <SearchInput
        clearLabel={t("home.search-clear")}
        name={HOME_PAGE_SEARCH_INPUT_NAME}
        onChange={handleChange}
        placeholder={t("home.search-placeholder")}
        value={value}
      />
      <button className={styles["home-page-search-submit"]} type="submit">
        {t("home.search-submit")}
      </button>
    </form>
  );
}
