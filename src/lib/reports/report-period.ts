import type {
  RecurrenceFrequency,
  RecurrenceValue,
  Weekday,
} from "@/ui/recurrence-picker/recurrence-picker.types";
import {
  formatRecurrenceLabel,
  type RecurrenceLabelTranslator,
} from "@/ui/recurrence-picker/format-recurrence-label";
import { weekdays } from "@/ui/recurrence-picker/recurrence-picker.types";
import {
  normalizeMonthDays,
  normalizeRecurrenceValue,
  normalizeTimes,
  normalizeWeekdays,
} from "@/ui/recurrence-picker/recurrence-picker.utils";

type FormatStoredReportPeriodInput = {
  locale: string;
  period: string;
  t: RecurrenceLabelTranslator;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFrequency(value: unknown): value is RecurrenceFrequency {
  return value === "daily" || value === "weekly" || value === "monthly";
}

function isWeekday(value: unknown): value is Weekday {
  return typeof value === "string" && weekdays.includes(value as Weekday);
}

export function parseStoredReportPeriod(period: string): RecurrenceValue {
  const parsedValue = JSON.parse(period) as unknown;

  if (!isRecord(parsedValue)) {
    throw new Error("Report period must be an object.");
  }

  const frequency = parsedValue["frequency"];
  const interval = parsedValue["interval"];
  const monthDays = parsedValue["monthDays"];
  const times = parsedValue["times"];
  const selectedWeekdays = parsedValue["weekdays"];

  if (!isFrequency(frequency)) {
    throw new Error("Report period frequency is invalid.");
  }

  if (typeof interval !== "number" || !Number.isInteger(interval) || interval < 1) {
    throw new Error("Report period interval is invalid.");
  }

  if (!Array.isArray(times) || !times.every((value) => typeof value === "string")) {
    throw new Error("Report period times are invalid.");
  }

  if (normalizeTimes(times).length !== times.length) {
    throw new Error("Report period times contain invalid values.");
  }

  if (
    selectedWeekdays !== undefined &&
    (!Array.isArray(selectedWeekdays) || !selectedWeekdays.every(isWeekday))
  ) {
    throw new Error("Report period weekdays are invalid.");
  }

  if (
    monthDays !== undefined &&
    (!Array.isArray(monthDays) ||
      !monthDays.every((value) => Number.isInteger(value) && value >= 1 && value <= 31))
  ) {
    throw new Error("Report period month days are invalid.");
  }

  return normalizeRecurrenceValue({
    frequency,
    interval,
    monthDays: normalizeMonthDays(monthDays as number[] | undefined),
    times: times as string[],
    weekdays: normalizeWeekdays(selectedWeekdays as Weekday[] | undefined),
  });
}

export function serializeStoredReportPeriod(value: RecurrenceValue) {
  return JSON.stringify(normalizeRecurrenceValue(value));
}

export function formatStoredReportPeriod({
  locale,
  period,
  t,
}: FormatStoredReportPeriodInput) {
  return formatRecurrenceLabel({
    locale,
    t,
    value: parseStoredReportPeriod(period),
  });
}
