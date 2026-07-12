"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { submitStartDirectoriesUpdate } from "@/app/(protected)/directories/actions";
import { formatLogMessage } from "@/lib/logs";
import { Stats, useToast } from "@/ui";

import styles from "../page.module.scss";

type DirectoriesPageViewProps = {
  postsCount: number;
  sourcesCount: number;
};

export function DirectoriesPageView({
  postsCount,
  sourcesCount,
}: DirectoriesPageViewProps) {
  const t = useTranslations();
  const { showToast } = useToast();
  const [isUpdateStarted, setIsUpdateStarted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleUpdateClick() {
    startTransition(async () => {
      try {
        const result = await submitStartDirectoriesUpdate();

        if (result.status === "already-running") {
          showToast({
            message: t("directories.update-already-running"),
            status: "warning",
          });

          return;
        }

        setIsUpdateStarted(true);
        showToast({
          message: t("directories.update-started"),
          status: "success",
        });
      } catch (error) {
        console.error(formatLogMessage("Failed to start directories update."), error);
        showToast({
          message: t("directories.update-error"),
          status: "error",
        });
      }
    });
  }

  return (
    <section className={styles["directories-page"]}>
      <div className={styles["summary-layout"]}>
        <section className={styles["summary-card"]}>
          <div className={styles["section-head"]}>
            <h2 className={styles["section-title"]}>{t("directories.title")}</h2>
          </div>
          <Stats
            className={styles["summary-stats"]}
            stats={[
              {
                title: t("directories.sources-title"),
                value: sourcesCount.toLocaleString(),
              },
              {
                title: t("directories.posts-title"),
                value: postsCount.toLocaleString(),
              },
            ]}
          />
        </section>
        <button
          className={styles["update-button"]}
          disabled={isPending || isUpdateStarted}
          type="button"
          onClick={handleUpdateClick}
        >
          {t("directories.update-button")}
        </button>
      </div>
    </section>
  );
}
