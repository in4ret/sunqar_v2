"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { StatsValueSkeleton } from "@/ui/stats/stats";

import styles from "./comments-page-count.module.scss";

type CommentsPageCountProps = {
  hasLoadedStoredPosts: boolean;
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
  searchTrigger: number;
  selectedPosts: string[];
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

export function CommentsPageCount({
  hasLoadedStoredPosts,
  searchFrom,
  searchQuery,
  searchTo,
  searchTrigger,
  selectedPosts,
}: CommentsPageCountProps) {
  const t = useTranslations();
  const [state, setState] = useState<CountState>({ status: "loading" });
  const selectedPostsRef = useRef(selectedPosts);
  const formattedTotal = useMemo(() => {
    if (state.status !== "success") {
      return null;
    }

    return new Intl.NumberFormat().format(state.total);
  }, [state]);

  useEffect(() => {
    selectedPostsRef.current = selectedPosts;
  }, [selectedPosts]);

  useEffect(() => {
    if (!hasLoadedStoredPosts) {
      return;
    }

    const abortController = new AbortController();

    async function loadCount() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/comments", {
          body: JSON.stringify({
            from: searchFrom,
            posts: selectedPostsRef.current,
            query: searchQuery,
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
  }, [hasLoadedStoredPosts, searchFrom, searchQuery, searchTo, searchTrigger]);

  if (state.status === "error") {
    return <p className={styles["comments-page-count-error"]}>{t("comments.count-error")}</p>;
  }

  return (
    <section className={styles["comments-page-count"]}>
      <span className={styles["comments-page-count-label"]}>{t("comments.count-label")}</span>
      <strong className={styles["comments-page-count-value"]}>
        {state.status === "loading" ? <StatsValueSkeleton /> : formattedTotal}
      </strong>
    </section>
  );
}
