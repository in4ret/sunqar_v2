"use client";

import { useCallback, useRef } from "react";
import { useTranslations } from "next-intl";

import {
  EditSourceModal,
  type EditSourceModalHandle,
} from "../edit-source-modal/edit-source-modal";
import { SourceTable } from "../source-table/source-table";
import type {
  SourceManagerOption,
  SourceManagerSource,
} from "./source-manager.types";

import styles from "./source-manager.module.scss";

type SourceManagerProps = {
  countryOptions: SourceManagerOption[];
  sources: SourceManagerSource[];
  typeOptions: SourceManagerOption[];
};

export function SourceManager({
  countryOptions,
  sources,
  typeOptions,
}: SourceManagerProps) {
  const editModalRef = useRef<EditSourceModalHandle | null>(null);
  const t = useTranslations();

  const handleEditSource = useCallback((source: SourceManagerSource) => {
    editModalRef.current?.openEdit(source);
  }, []);

  const handleCreateSource = useCallback(() => {
    editModalRef.current?.openCreate();
  }, []);

  return (
    <>
      <div className={styles["section-head"]}>
        <div className={styles["section-copy-block"]}>
          <h2 className={styles["section-title"]}>{t("sources.current-sources")}</h2>
          <p className={styles["section-copy"]}>
            {t("sources.sources-count", { count: sources.length })}
          </p>
        </div>
        <button
          className={styles["create-button"]}
          type="button"
          onClick={handleCreateSource}
        >
          {t("sources.create-button")}
        </button>
      </div>
      {sources.length > 0 ? (
        <SourceTable onEdit={handleEditSource} sources={sources} />
      ) : (
        <p className={styles["empty-sources"]}>{t("sources.empty")}</p>
      )}
      <EditSourceModal
        countryOptions={countryOptions}
        ref={editModalRef}
        typeOptions={typeOptions}
      />
    </>
  );
}
