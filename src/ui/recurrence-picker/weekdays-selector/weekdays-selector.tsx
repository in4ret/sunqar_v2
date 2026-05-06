"use client";

import { useTranslations } from "next-intl";
import type { Weekday } from "../recurrence-picker.types";
import { weekdays } from "../recurrence-picker.types";
import { normalizeWeekdays } from "../recurrence-picker.utils";
import styles from "./weekdays-selector.module.scss";

type WeekdaysSelectorProps = {
  disabled?: boolean;
  onChange: (weekdays: Weekday[]) => void;
  value?: Weekday[];
};

export function WeekdaysSelector({
  disabled = false,
  onChange,
  value,
}: WeekdaysSelectorProps) {
  const t = useTranslations("recurrence-picker");
  const selectedWeekdays = normalizeWeekdays(value) ?? [];

  return (
    <section className={styles["section"]}>
      <div className={styles["section-head"]}>
        <p className={styles["section-title"]}>{t("weekdays.label")}</p>
        <p className={styles["section-hint"]}>{t("weekdays.hint")}</p>
      </div>
      <div className={styles["grid"]}>
        {weekdays.map((weekday) => {
          const isSelected = selectedWeekdays.includes(weekday);

          return (
            <button
              key={weekday}
              aria-pressed={isSelected}
              className={styles["chip"]}
              data-selected={isSelected}
              disabled={disabled}
              type="button"
              onClick={() => {
                const nextWeekdays = isSelected
                  ? selectedWeekdays.filter((selectedWeekday) => selectedWeekday !== weekday)
                  : [...selectedWeekdays, weekday];

                onChange(normalizeWeekdays(nextWeekdays) ?? []);
              }}
            >
              {t(`weekdays.short.${weekday}`)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
