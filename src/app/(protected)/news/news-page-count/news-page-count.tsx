"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { StatsValueSkeleton } from "@/ui/stats/stats";

import styles from "./news-page-count.module.scss";

type NewsPageCountProps = {
  hasLoadedStoredSources: boolean;
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
  searchTrigger: number;
  selectedSources: string[];
};

type CountState =
  | {
      status: "loading";
    }
  | {
      status: "success";
      total: number;
    }
  | {
      status: "error";
    };

export function NewsPageCount({
  hasLoadedStoredSources,
  searchFrom,
  searchQuery,
  searchTo,
  searchTrigger,
  selectedSources,
}: NewsPageCountProps) {
  const t = useTranslations();
  const [state, setState] = useState<CountState>({ status: "loading" });
  const selectedSourcesRef = useRef(selectedSources);
  const formattedTotal = useMemo(() => {
    if (state.status !== "success") {
      return null;
    }

    return new Intl.NumberFormat().format(state.total);
  }, [state]);

  useEffect(() => {
    selectedSourcesRef.current = selectedSources;
  }, [selectedSources]);

  useEffect(() => {
    if (!hasLoadedStoredSources) {
      return;
    }

    const abortController = new AbortController();

    async function loadCount() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/news", {
          body: JSON.stringify({
            from: searchFrom,
            query: searchQuery,
            sources: selectedSourcesRef.current,
            to: searchTo,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { total?: unknown };

        if (typeof payload.total !== "number") {
          throw new Error("Response payload is invalid.");
        }

        setState({
          status: "success",
          total: payload.total,
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setState({ status: "error" });
      }
    }

    void loadCount();

    return () => {
      abortController.abort();
    };
  }, [hasLoadedStoredSources, searchFrom, searchQuery, searchTo, searchTrigger]);

  if (state.status === "error") {
    return <p className={styles["news-page-count-error"]}>{t("news.count-error")}</p>;
  }

  return (
    <section className={styles["news-page-count"]}>
      <span className={styles["news-page-count-label"]}>{t("news.count-label")}</span>
      <strong className={styles["news-page-count-value"]}>
        {state.status === "loading" ? <StatsValueSkeleton /> : formattedTotal}
      </strong>
    </section>
  );
}
