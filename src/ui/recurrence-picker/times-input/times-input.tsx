"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { normalizeTimes } from "../recurrence-picker.utils";

import styles from "./times-input.module.scss";

type TimesInputProps = {
  disabled?: boolean;
  onChange: (times: string[]) => void;
  value: string[];
};

function getDraftTimes(times: string[]) {
  return times.length > 0 ? times : [""];
}

export function TimesInput({
  disabled = false,
  onChange,
  value,
}: TimesInputProps) {
  const [draftTimes, setDraftTimes] = useState<string[]>(() => getDraftTimes(value));
  const t = useTranslations("recurrence-picker");
  const hasEmptyTime = draftTimes.some((time) => time.trim() === "");

  useEffect(() => {
    setDraftTimes(getDraftTimes(value));
  }, [value]);

  function emitTimes(nextDraftTimes: string[]) {
    onChange(normalizeTimes(nextDraftTimes));
  }

  return (
    <section className={styles["section"]}>
      <div className={styles["section-head"]}>
        <p className={styles["section-title"]}>{t("times.label")}</p>
        <p className={styles["section-hint"]}>{t("times.hint")}</p>
      </div>
      <div className={styles["list"]}>
        {draftTimes.map((time, index) => (
          <div key={`${index}-${time || "empty"}`} className={styles["row"]}>
            <input
              aria-label={t("times.row-label", { index: index + 1 })}
              className={styles["input"]}
              disabled={disabled}
              step={60}
              type="time"
              value={time}
              onChange={(event) => {
                const nextDraftTimes = draftTimes.map((draftTime, draftIndex) =>
                  draftIndex === index ? event.currentTarget.value : draftTime,
                );

                setDraftTimes(nextDraftTimes);
                emitTimes(nextDraftTimes);
              }}
            />
            <button
              aria-label={t("times.remove")}
              className={styles["remove-button"]}
              disabled={disabled}
              type="button"
              onClick={() => {
                const nextDraftTimes = draftTimes.filter((_, draftIndex) => draftIndex !== index);
                const safeDraftTimes = nextDraftTimes.length > 0 ? nextDraftTimes : [""];

                setDraftTimes(safeDraftTimes);
                emitTimes(nextDraftTimes);
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
          setDraftTimes((currentDraftTimes) => [...currentDraftTimes, ""]);
        }}
      >
        {t("times.add")}
      </button>
    </section>
  );
}
