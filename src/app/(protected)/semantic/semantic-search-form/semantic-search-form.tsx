"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { normalizeSearchQuery } from "@/lib/utils";
import { SearchInput } from "@/ui";

import styles from "./semantic-search-form.module.scss";

type SemanticSearchFormProps = {
  searchQuery: string;
  onSearchSubmit: (query: string) => void;
};

export function SemanticSearchForm({ searchQuery, onSearchSubmit }: SemanticSearchFormProps) {
  const t = useTranslations();
  const [value, setValue] = useState(searchQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = normalizeSearchQuery(value);

    if (!query) {
      return;
    }

    setValue(query);
    onSearchSubmit(query);
  }

  return (
    <form className={styles["search-form"]} onSubmit={handleSubmit} role="search">
      <label className={styles["search-field"]}>
        <span className={styles["search-label"]}>{t("semantic.search-label")}</span>
        <SearchInput
          clearLabel={t("home.search-clear")}
          name="sunqar-semantic-search-query"
          onChange={setValue}
          placeholder={t("semantic.search-placeholder")}
          value={value}
        />
      </label>
      <button
        className={styles["search-submit"]}
        disabled={!normalizeSearchQuery(value)}
        type="submit"
      >
        {t("home.search-submit")}
      </button>
    </form>
  );
}
