"use client";

import { useTranslations } from "next-intl";
import { normalizeMonthDays } from "../recurrence-picker.utils";
import styles from "./month-days-selector.module.scss";

type MonthDaysSelectorProps = {
  disabled?: boolean;
  onChange: (monthDays: number[]) => void;
  value?: number[];
};

const monthDays = Array.from({ length: 31 }, (_, index) => index + 1);

export function MonthDaysSelector({
  disabled = false,
  onChange,
  value,
}: MonthDaysSelectorProps) {
  const t = useTranslations("recurrence-picker");
  const selectedMonthDays = normalizeMonthDays(value) ?? [];

  return (
    <section className={styles["section"]}>
      <div className={styles["section-head"]}>
        <p className={styles["section-title"]}>{t("month-days.label")}</p>
        <p className={styles["section-hint"]}>{t("month-days.hint")}</p>
      </div>
      <div className={styles["grid"]}>
        {monthDays.map((monthDay) => {
          const isSelected = selectedMonthDays.includes(monthDay);

          return (
            <button
              key={monthDay}
              aria-pressed={isSelected}
              className={styles["chip"]}
              data-selected={isSelected}
              disabled={disabled}
              type="button"
              onClick={() => {
                const nextMonthDays = isSelected
                  ? selectedMonthDays.filter((selectedMonthDay) => selectedMonthDay !== monthDay)
                  : [...selectedMonthDays, monthDay];

                onChange(normalizeMonthDays(nextMonthDays) ?? []);
              }}
            >
              {monthDay}
            </button>
          );
        })}
      </div>
    </section>
  );
}
