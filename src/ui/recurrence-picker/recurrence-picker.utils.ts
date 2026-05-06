import type { RecurrenceFrequency, RecurrenceValue, Weekday } from "./recurrence-picker.types";
import { weekdays } from "./recurrence-picker.types";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

export function normalizeRecurrenceValue(value: RecurrenceValue): RecurrenceValue {
  return {
    ...value,
    frequency: normalizeFrequency(value.frequency),
    interval: normalizeInterval(value.interval),
    monthDays: normalizeMonthDays(value.monthDays),
    times: normalizeTimes(value.times),
    weekdays: normalizeWeekdays(value.weekdays),
  };
}
