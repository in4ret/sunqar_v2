import type { RecurrenceFrequency, RecurrenceValue, Weekday } from "./recurrence-picker.types";
import { weekdays } from "./recurrence-picker.types";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_TIME = "09:00";
const WEEKDAY_BY_UTC_DAY: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

type NormalizeRecurrenceOptions = {
  fallbackDate?: Date;
  timeZone?: string;
};

type LocalDateParts = {
  day: number;
  month: number;
  year: number;
};

export function normalizeInterval(interval: number) {
  if (!Number.isFinite(interval)) {
    return 1;
  }

  return Math.max(1, Math.floor(interval));
}

export function normalizeWeekdays(input?: Weekday[]) {
  if (!input) {
    return undefined;
  }

  return weekdays.filter((weekday) => input.includes(weekday));
}

export function normalizeMonthDays(input?: number[]) {
  if (!input) {
    return undefined;
  }

  return [...new Set(input.map((day) => Math.floor(day)).filter((day) => day >= 1 && day <= 31))].sort(
    (left, right) => left - right,
  );
}

export function isValidTime(value: string) {
  return timePattern.test(value);
}

export function normalizeTimes(input: string[]) {
  return [...new Set(input.filter(isValidTime))].sort((left, right) => left.localeCompare(right));
}

export function normalizeFrequency(frequency: string): RecurrenceFrequency {
  if (frequency === "weekly" || frequency === "monthly") {
    return frequency;
  }

  return "daily";
}

function getLocalDateParts(date: Date, timeZone?: string): LocalDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);

  return {
    day: Number(parts.find((part) => part.type === "day")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    year: Number(parts.find((part) => part.type === "year")?.value),
  };
}

function getFallbackWeekday(date: Date, timeZone?: string): Weekday {
  const localDateParts = getLocalDateParts(date, timeZone);
  const utcDay = new Date(
    Date.UTC(localDateParts.year, localDateParts.month - 1, localDateParts.day, 12),
  ).getUTCDay();

  return WEEKDAY_BY_UTC_DAY[utcDay] ?? "monday";
}

export function normalizeRecurrenceValue(
  value: RecurrenceValue,
  options?: NormalizeRecurrenceOptions,
): RecurrenceValue {
  const frequency = normalizeFrequency(value.frequency);
  const interval = normalizeInterval(value.interval);
  const fallbackDate = options?.fallbackDate ?? new Date();
  const normalizedTimes = normalizeTimes(value.times);
  const times = normalizedTimes.length > 0 ? normalizedTimes : [DEFAULT_TIME];
  const normalizedWeekdays = normalizeWeekdays(value.weekdays);
  const normalizedMonthDays = normalizeMonthDays(value.monthDays);

  if (frequency === "weekly") {
    return {
      ...value,
      frequency,
      interval,
      monthDays: normalizedMonthDays,
      times,
      weekdays:
        normalizedWeekdays && normalizedWeekdays.length > 0
          ? normalizedWeekdays
          : [getFallbackWeekday(fallbackDate, options?.timeZone)],
    };
  }

  if (frequency === "monthly") {
    return {
      ...value,
      frequency,
      interval,
      monthDays:
        normalizedMonthDays && normalizedMonthDays.length > 0
          ? normalizedMonthDays
          : [getLocalDateParts(fallbackDate, options?.timeZone).day],
      times,
      weekdays: normalizedWeekdays,
    };
  }

  return {
    ...value,
    frequency,
    interval,
    monthDays: normalizedMonthDays,
    times,
    weekdays: normalizedWeekdays,
  };
}
