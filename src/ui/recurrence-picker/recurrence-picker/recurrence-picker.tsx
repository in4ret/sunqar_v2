"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { RecurrencePickerProps } from "../recurrence-picker.types";
import { FrequencySelect } from "../frequency-select/frequency-select";
import { formatRecurrenceLabel } from "../format-recurrence-label";
import { HumanReadablePreview } from "../human-readable-preview/human-readable-preview";
import { IntervalInput } from "../interval-input/interval-input";
import { MonthDaysSelector } from "../month-days-selector/month-days-selector";
import { normalizeRecurrenceValue } from "../recurrence-picker.utils";
import { TimesInput } from "../times-input/times-input";
import { WeekdaysSelector } from "../weekdays-selector/weekdays-selector";
import styles from "./recurrence-picker.module.scss";

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles["field-action-icon"]}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 20h4l10-10-4-4L4 16v4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m12 6 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="m14 4 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function RecurrencePicker({
  className,
  disabled = false,
  onChange,
  value,
}: RecurrencePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedValue = normalizeRecurrenceValue(value);
  const [draftValue, setDraftValue] = useState(normalizedValue);
  const dialogTitleId = useId();
  const locale = useLocale();
  const t = useTranslations("recurrence-picker");
  const classNames = [styles["recurrence-picker"], className].filter(Boolean).join(" ");
  const fieldValue =
    formatRecurrenceLabel({
      locale,
      t,
      value: normalizedValue,
    }) || t("field.placeholder");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function updateDraftValue(nextValue: Partial<typeof normalizedValue>) {
    setDraftValue((currentDraftValue) =>
      normalizeRecurrenceValue({
        ...currentDraftValue,
        ...nextValue,
      }),
    );
  }

  function openModal() {
    if (disabled) {
      return;
    }

    setDraftValue(normalizedValue);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  function saveDraftValue() {
    onChange(normalizeRecurrenceValue(draftValue));
    setIsOpen(false);
  }

  return (
    <>
      <section className={classNames}>
        <button
          aria-label={`${fieldValue}. ${t("field.edit")}`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={styles["field-trigger"]}
          disabled={disabled}
          type="button"
          onClick={openModal}
        >
          <span className={styles["field-value"]}>{fieldValue}</span>
          <span className={styles["field-action"]}>
            <EditIcon />
          </span>
        </button>
      </section>
      {isOpen ? (
        <div className={styles["modal-overlay"]} role="presentation" onClick={closeModal}>
          <section
            aria-labelledby={dialogTitleId}
            aria-modal="true"
            className={styles["modal"]}
            role="dialog"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className={styles["modal-head"]}>
              <h2 className={styles["modal-title"]} id={dialogTitleId}>
                {t("modal.title")}
              </h2>
            </div>
            <div className={styles["modal-body"]}>
              <div className={styles["top-row"]}>
                <FrequencySelect
                  disabled={disabled}
                  value={draftValue.frequency}
                  onChange={(frequency) => updateDraftValue({ frequency })}
                />
                <IntervalInput
                  disabled={disabled}
                  value={draftValue.interval}
                  onChange={(interval) => updateDraftValue({ interval })}
                />
              </div>
              <div className={styles["selectors"]}>
                {draftValue.frequency === "weekly" ? (
                  <WeekdaysSelector
                    disabled={disabled}
                    value={draftValue.weekdays}
                    onChange={(weekdays) => updateDraftValue({ weekdays })}
                  />
                ) : null}
                {draftValue.frequency === "monthly" ? (
                  <MonthDaysSelector
                    disabled={disabled}
                    value={draftValue.monthDays}
                    onChange={(monthDays) => updateDraftValue({ monthDays })}
                  />
                ) : null}
                <TimesInput
                  disabled={disabled}
                  value={draftValue.times}
                  onChange={(times) => updateDraftValue({ times })}
                />
              </div>
              <HumanReadablePreview value={draftValue} />
            </div>
            <div className={styles["actions"]}>
              <button
                className={styles["cancel-button"]}
                disabled={disabled}
                type="button"
                onClick={closeModal}
              >
                {t("actions.cancel")}
              </button>
              <button
                className={styles["save-button"]}
                disabled={disabled}
                type="button"
                onClick={saveDraftValue}
              >
                {t("actions.save")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
