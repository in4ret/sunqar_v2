"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Modal } from "@/ui";

import styles from "./report-sources-block.module.scss";

type ReportSourcesBlockProps = {
  legendColor: number;
  sources: string[];
};

const VISIBLE_SOURCES_COUNT = 5;

export function ReportSourcesBlock({
  legendColor,
  sources,
}: ReportSourcesBlockProps) {
  const t = useTranslations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const visibleSources = sources.slice(0, VISIBLE_SOURCES_COUNT);
  const hasHiddenSources = sources.length > VISIBLE_SOURCES_COUNT;

  return (
    <li className={styles["report-sources-block"]} data-legend-color={legendColor}>
      <div className={styles["report-sources-pills"]}>
        {visibleSources.map((source, index) => (
          <span className={styles["report-source-pill"]} key={`${source}-${index}`}>
            {source}
          </span>
        ))}
      </div>
      {hasHiddenSources ? (
        <button
          className={styles["show-all-button"]}
          type="button"
          onClick={() => {
            setIsModalOpen(true);
          }}
        >
          {t("home.reports-table-sources-show-all", { count: sources.length })}
        </button>
      ) : null}
      <Modal
        closeLabel={t("home.reports-table-sources-modal-close")}
        isOpen={isModalOpen}
        title={t("home.reports-table-sources-modal-title")}
        onClose={() => {
          setIsModalOpen(false);
        }}
      >
        <div className={styles["report-sources-pills"]}>
          <ul className={styles["modal-sources-list"]}>
            {sources.map((source, index) => (
              <li key={`${source}-${index}`}>
                <span className={styles["report-source-pill"]}>{source}</span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </li>
  );
}
