"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { normalizeInterval } from "../recurrence-picker.utils";

import styles from "./interval-input.module.scss";

type IntervalInputProps = {
  disabled?: boolean;
  onChange: (interval: number) => void;
  value: number;
};

export function IntervalInput({
  disabled = false,
  onChange,
  value,
}: IntervalInputProps) {
  const [inputValue, setInputValue] = useState(String(normalizeInterval(value)));
  const t = useTranslations("recurrence-picker");

  return (
    <label className={styles["field"]}>
      <span className={styles["field-label"]}>{t("interval.label")}</span>
      <input
        className={styles["input"]}
        disabled={disabled}
        inputMode="numeric"
        min={1}
        step={1}
        type="number"
        value={inputValue}
        onBlur={() => {
          const nextValue = normalizeInterval(Number(inputValue));
          setInputValue(String(nextValue));
          onChange(nextValue);
        }}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          setInputValue(nextValue);

          const parsedValue = Number(nextValue);

          if (!nextValue.trim() || Number.isNaN(parsedValue)) {
            return;
          }

          onChange(normalizeInterval(parsedValue));
        }}
      />
    </label>
  );
}
