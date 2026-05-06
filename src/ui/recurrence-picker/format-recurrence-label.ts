import type { RecurrenceValue, Weekday } from "./recurrence-picker.types";
import {
  normalizeMonthDays,
  normalizeRecurrenceValue,
  normalizeWeekdays,
} from "./recurrence-picker.utils";

type RecurrenceTranslationValues = Record<string, number | string>;

export type RecurrenceLabelTranslator = (
  key: string,
  values?: RecurrenceTranslationValues,
) => string;

type FormatRecurrenceLabelInput = {
  locale: string;
  t: RecurrenceLabelTranslator;
  value: RecurrenceValue;
};

function getWeekdayLabels(
  locale: string,
  t: RecurrenceLabelTranslator,
  weekdays: Weekday[],
) {
  const formatter = new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  });

  return formatter.format(weekdays.map((weekday) => t(`weekdays.long.${weekday}`)));
}

function getMonthDayLabels(locale: string, monthDays: number[]) {
  const formatter = new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  });

  return formatter.format(monthDays.map((monthDay) => String(monthDay)));
}

function getTimeLabels(locale: string, times: string[]) {
  const formatter = new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  });

  return formatter.format(times);
}

export function formatRecurrenceLabel({
  locale,
  t,
  value,
}: FormatRecurrenceLabelInput) {
  const normalizedValue = normalizeRecurrenceValue(value);
  const previewParts = [
    t(`preview.frequency.${normalizedValue.frequency}`, {
      interval: normalizedValue.interval,
    }),
  ];

  if (normalizedValue.frequency === "weekly") {
    const normalizedWeekdays = normalizeWeekdays(normalizedValue.weekdays) ?? [];

    if (normalizedWeekdays.length > 0) {
      previewParts.push(
        t("preview.weekdays", {
          weekdays: getWeekdayLabels(locale, t, normalizedWeekdays),
        }),
      );
    }
  }

  if (normalizedValue.frequency === "monthly") {
    const normalizedMonthDays = normalizeMonthDays(normalizedValue.monthDays) ?? [];

    if (normalizedMonthDays.length > 0) {
      previewParts.push(
        t("preview.month-days", {
          monthDays: getMonthDayLabels(locale, normalizedMonthDays),
        }),
      );
    }
  }

  if (normalizedValue.times.length > 0) {
    previewParts.push(
      t("preview.times", {
        times: getTimeLabels(locale, normalizedValue.times),
      }),
    );
  } else {
    previewParts.push(t("preview.no-times"));
  }

  return previewParts.join(" • ");
}
