"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { routes } from "@/lib/routes";
import { isSemanticSearchArticles, type SemanticSearchArticle } from "@/lib/semantic/semantic-search.types";
import {
  getStoredSemanticSearchQuery,
  setStoredSemanticSearchQuery,
} from "@/lib/semantic/semantic-search-storage";
import { normalizeSearchQuery } from "@/lib/utils";

import { SemanticSearchForm } from "../semantic-search-form/semantic-search-form";
import { SemanticSearchTable } from "../semantic-search-table/semantic-search-table";

import styles from "./semantic-page-view.module.scss";

type SearchState =
  | { status: "idle" | "loading" | "error" }
  | { status: "success"; articles: SemanticSearchArticle[] };

function searchHref(query: string) {
  const params = new URLSearchParams({ q: query });
  return `${routes.semantic}?${params}`;
}

export function SemanticPageView() {
  const t = useTranslations("semantic");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q");
  const query = normalizeSearchQuery(rawQuery ?? "");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);
  const handledQueryRef = useRef<string | null | undefined>(undefined);
  const lastSubmittedQueryRef = useRef("");

  const runSearch = useCallback(async (searchQuery: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    lastSubmittedQueryRef.current = searchQuery;
    setState({ status: "loading" });

    try {
      const params = new URLSearchParams({ user_prompt: searchQuery });
      const response = await fetch(`/api/semantic-search?${params}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Semantic search request failed.");
      }

      const payload: unknown = await response.json();

      if (
        !payload || typeof payload !== "object" || !("articles" in payload) ||
        !isSemanticSearchArticles(payload.articles)
      ) {
        throw new Error("Semantic search response is invalid.");
      }

      if (!controller.signal.aborted) {
        setState({ status: "success", articles: payload.articles });
      }
    } catch {
      if (!controller.signal.aborted) {
        setState({ status: "error" });
      }
    }
  }, []);

  useEffect(() => {
    if (rawQuery === null) {
      const storedQuery = getStoredSemanticSearchQuery();

      if (storedQuery) {
        router.replace(searchHref(storedQuery), { scroll: false });
        return;
      }
    }

    if (handledQueryRef.current === rawQuery) {
      return;
    }

    controllerRef.current?.abort();
    let cancelled = false;

    // Defer URL-driven work so a superseding navigation can cancel it first.
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      handledQueryRef.current = rawQuery;

      if (query) {
        void runSearch(query);
      } else {
        setState({ status: "idle" });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [query, rawQuery, router, runSearch]);

  useEffect(() => () => {
    controllerRef.current?.abort();
    handledQueryRef.current = undefined;
  }, []);

  function handleSearchSubmit(searchQuery: string) {
    setStoredSemanticSearchQuery(searchQuery);
    // Mark this URL as handled so its arrival does not duplicate the request.
    handledQueryRef.current = searchQuery;
    void runSearch(searchQuery);
    router.push(searchHref(searchQuery), { scroll: false });
  }

  return (
    <div className={styles["semantic-page"]}>
      <SemanticSearchForm key={rawQuery ?? ""} searchQuery={query} onSearchSubmit={handleSearchSubmit} />
      <div aria-live="polite" aria-busy={state.status === "loading"}>
        {state.status === "loading" ? <p className={styles["status"]}>{t("loading")}</p> : null}
        {state.status === "success" ? (
          <div className={styles["results"]}>
            <p className={styles["status"]}>
              {t("result-count", { count: new Intl.NumberFormat(locale).format(state.articles.length) })}
            </p>
            <SemanticSearchTable articles={state.articles} />
          </div>
        ) : null}
        {state.status === "error" ? (
          <div className={styles["error"]}>
            <p className={styles["status"]}>{t("error")}</p>
            <button
              className={styles["retry-button"]}
              onClick={() => void runSearch(lastSubmittedQueryRef.current)}
              type="button"
            >
              {t("retry")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
