"use client";

import { useTranslations } from "next-intl";

import { Dropdown } from "@/ui";

import type { RecurrenceFrequency } from "../recurrence-picker.types";

import styles from "./frequency-select.module.scss";

type FrequencySelectProps = {
  disabled?: boolean;
  onChange: (frequency: RecurrenceFrequency) => void;
  value: RecurrenceFrequency;
};

export function FrequencySelect({
  disabled = false,
  onChange,
  value,
}: FrequencySelectProps) {
  const t = useTranslations("recurrence-picker");

  return (
    <label className={styles["field"]}>
      <span className={styles["field-label"]}>{t("frequency.label")}</span>
      <Dropdown
        aria-label={t("frequency.label")}
        className={styles["field-control"]}
        disabled={disabled}
        onChange={(nextValue) => {
          if (nextValue === "daily" || nextValue === "weekly" || nextValue === "monthly") {
            onChange(nextValue);
          }
        }}
        options={[
          { label: t("frequency.daily"), value: "daily" },
          { label: t("frequency.weekly"), value: "weekly" },
          { label: t("frequency.monthly"), value: "monthly" },
        ]}
        value={value}
      />
    </label>
  );
}
