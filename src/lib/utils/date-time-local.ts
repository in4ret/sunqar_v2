const DATE_TIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

type DateTimeLocalParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  year: number;
};

function parseDateTimeLocalParts(value: string): DateTimeLocalParts | null {
  const trimmedValue = value.trim();
  const match = DATE_TIME_LOCAL_PATTERN.exec(trimmedValue);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const parts = {
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    month: Number(month),
    year: Number(year),
  };
  const date = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== parts.year ||
    date.getMonth() !== parts.month - 1 ||
    date.getDate() !== parts.day ||
    date.getHours() !== parts.hour ||
    date.getMinutes() !== parts.minute
  ) {
    return null;
  }

  return parts;
}

export function normalizeDateTimeLocalValue(value: string) {
  const parts = parseDateTimeLocalParts(value);

  if (!parts) {
    return "";
  }

  return [
    `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
  ].join("T");
}

export function normalizeDateTimeLocalParam(searchParam: string | string[] | undefined) {
  const value = typeof searchParam === "string" ? searchParam : searchParam?.[0] ?? "";

  return normalizeDateTimeLocalValue(value);
}

export function normalizeEpochSecondsParam(searchParam: string | string[] | undefined) {
  const value = typeof searchParam === "string" ? searchParam : searchParam?.[0] ?? "";
  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return "";
  }

  const epochSeconds = Number(trimmedValue);

  if (!Number.isSafeInteger(epochSeconds) || epochSeconds < 0) {
    return "";
  }

  return String(epochSeconds);
}

export function formatDateTimeLocalValue(date: Date) {
  const timestamp = date.getTime();

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  return [
    `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`,
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  ].join("T");
}

export function formatEpochSecondsToDateTimeLocalValue(value: string) {
  const normalizedValue = normalizeEpochSecondsParam(value);

  if (!normalizedValue) {
    return "";
  }

  return formatDateTimeLocalValue(new Date(Number(normalizedValue) * 1000));
}

export function getDefaultNewsPageSearchFromValue(now: Date = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const defaultSearchFrom = new Date(startOfToday);

  defaultSearchFrom.setDate(defaultSearchFrom.getDate() - 6);

  return formatDateTimeLocalValue(defaultSearchFrom);
}

export function resolveDefaultSearchDateRange(
  input: { from: string; to: string },
  now: Date = new Date(),
) {
  if (input.from === "" && input.to === "") {
    return {
      from: getDefaultNewsPageSearchFromValue(now),
      to: "",
    };
  }

  return input;
}

export function resolveSubmittedSearchDateRange(
  input: { from: string; to: string },
  now: Date = new Date(),
) {
  const range = resolveDefaultSearchDateRange(input, now);

  return {
    from: range.from,
    fromEpochSeconds: formatDateTimeLocalValueToEpochSeconds(range.from),
    to: range.to,
    toEpochSeconds: formatDateTimeLocalValueToEpochSeconds(range.to),
  };
}

export function parseDateTimeLocalValueToEpochSeconds(value: string) {
  const parts = parseDateTimeLocalParts(value);

  if (!parts) {
    return null;
  }

  const timestamp = new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    0,
    0,
  ).getTime();

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Math.floor(timestamp / 1000);
}

export function formatDateTimeLocalValueToEpochSeconds(value: string) {
  const epochSeconds = parseDateTimeLocalValueToEpochSeconds(value);

  return epochSeconds === null ? "" : String(epochSeconds);
}
