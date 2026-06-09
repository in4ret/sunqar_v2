"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import styles from "./times-input.module.scss";

type TimesInputProps = {
  disabled?: boolean;
  onChange: (times: string[]) => void;
  value: string[];
};

type DraftTimeRow = {
  id: string;
  value: string;
};

function createDraftTimeRow(time: string): DraftTimeRow {
  return {
    id: crypto.randomUUID(),
    value: time,
  };
}

function getDraftTimes(times: string[]) {
  return times.length > 0 ? times : [""];
}

export function TimesInput({
  disabled = false,
  onChange,
  value,
}: TimesInputProps) {
  const [draftTimeRows, setDraftTimeRows] = useState<DraftTimeRow[]>(() =>
    getDraftTimes(value).map(createDraftTimeRow),
  );
  const t = useTranslations("recurrence-picker");
  const hasEmptyTime = draftTimeRows.some((row) => row.value.trim() === "");

  function emitTimes(nextDraftTimeRows: DraftTimeRow[]) {
    onChange(nextDraftTimeRows.map((row) => row.value));
  }

  return (
    <section className={styles["section"]}>
      <div className={styles["section-head"]}>
        <p className={styles["section-title"]}>{t("times.label")}</p>
        <p className={styles["section-hint"]}>{t("times.hint")}</p>
      </div>
      <div className={styles["list"]}>
        {draftTimeRows.map((row, index) => (
          <div key={row.id} className={styles["row"]}>
            <input
              aria-label={t("times.row-label", { index: index + 1 })}
              className={styles["input"]}
              disabled={disabled}
              step={60}
              type="time"
              value={row.value}
              onChange={(event) => {
                const nextDraftTimeRows = draftTimeRows.map((draftTimeRow) =>
                  draftTimeRow.id === row.id
                    ? { ...draftTimeRow, value: event.currentTarget.value }
                    : draftTimeRow,
                );

                setDraftTimeRows(nextDraftTimeRows);
                emitTimes(nextDraftTimeRows);
              }}
            />
            <button
              aria-label={t("times.remove")}
              className={styles["remove-button"]}
              disabled={disabled}
              type="button"
              onClick={() => {
                const nextDraftTimeRows = draftTimeRows.filter(
                  (draftTimeRow) => draftTimeRow.id !== row.id,
                );
                const safeDraftTimeRows =
                  nextDraftTimeRows.length > 0 ? nextDraftTimeRows : [createDraftTimeRow("")];

                setDraftTimeRows(safeDraftTimeRows);
                emitTimes(nextDraftTimeRows);
              }}
            >
              {t("times.remove-short")}
            </button>
          </div>
        ))}
      </div>
      <button
        className={styles["add-button"]}
        disabled={disabled || hasEmptyTime}
        type="button"
        onClick={() => {
          setDraftTimeRows((currentDraftTimeRows) => [...currentDraftTimeRows, createDraftTimeRow("")]);
        }}
      >
        {t("times.add")}
      </button>
    </section>
  );
}
