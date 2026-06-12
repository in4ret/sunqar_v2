import "server-only";

import { unstable_cache } from "next/cache";

import { ONE_HOUR_REVALIDATE } from "@/lib/cache";
import { manticoreSql } from "@/lib/manticore";
import {
  type NewsChartGranularity,
  type NewsChartSourceBucket,
  type NewsChartSourceStats,
  OTHER_NEWS_SOURCE,
  UNKNOWN_NEWS_SOURCE,
} from "@/lib/news/news-chart-shared";
import {
  buildNewsWhereClause,
  type NewsQueryInput,
  type NormalizedNewsQueryInput,
  normalizeNewsEpochSecondsValue,
  normalizeNewsQueryInput,
} from "@/lib/news/news-filters";
import {
  getDefaultNewsPageSearchFromValue,
  parseDateTimeLocalValueToEpochSeconds,
} from "@/lib/utils";

type NewsChartCountRow = {
  bucket_date: string;
  source: string | null;
  total: number | string;
};

type EffectiveChartRange = {
  fromEpochSeconds: number | null;
  isOpenEndedToOnly: boolean;
  toEpochSeconds: number | null;
};

type ChartBucketSpec = {
  bucketEnd: string;
  bucketStart: string;
  dates: string[];
};

const ALMATY_TIME_ZONE = "Asia/Almaty";
const MAX_VISIBLE_SOURCES = 10;
const SECONDS_IN_DAY = 24 * 60 * 60;
const DAILY_GRANULARITY_DAYS = 31;
const WEEKLY_GRANULARITY_DAYS = 183;

function formatDateForTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatChartDate(date: Date) {
  return formatDateForTimeZone(date, "UTC");
}

function parseChartDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12));
}

function normalizeChartBucketDate(value: string) {
  const trimmedValue = value.trim();
  const matchedDate = trimmedValue.match(/^\d{4}-\d{2}-\d{2}/);

  if (matchedDate) {
    return matchedDate[0];
  }

  return formatChartDate(new Date(trimmedValue));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);

  next.setUTCDate(next.getUTCDate() + days);

  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);

  next.setUTCMonth(next.getUTCMonth() + months, 1);

  return next;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
}

function getLocalDateAtUtcNoon(epochSeconds: number, timeZone: string) {
  return parseChartDate(formatDateForTimeZone(new Date(epochSeconds * 1000), timeZone));
}

function buildDayBucketSpecs(fromEpochSeconds: number, toEpochSeconds: number) {
  const startDate = getLocalDateAtUtcNoon(fromEpochSeconds, ALMATY_TIME_ZONE);
  const endDate = getLocalDateAtUtcNoon(toEpochSeconds, ALMATY_TIME_ZONE);
  const buckets: ChartBucketSpec[] = [];

  for (
    let cursor = new Date(startDate);
    cursor.getTime() <= endDate.getTime();
    cursor = addDays(cursor, 1)
  ) {
    const date = formatChartDate(cursor);

    buckets.push({
      bucketEnd: date,
      bucketStart: date,
      dates: [date],
    });
  }

  return buckets;
}

function buildWeekBucketSpecs(fromEpochSeconds: number, toEpochSeconds: number) {
  const startDate = getLocalDateAtUtcNoon(fromEpochSeconds, ALMATY_TIME_ZONE);
  const endDate = getLocalDateAtUtcNoon(toEpochSeconds, ALMATY_TIME_ZONE);
  const buckets: ChartBucketSpec[] = [];

  for (
    let weekStart = new Date(startDate);
    weekStart.getTime() <= endDate.getTime();
    weekStart = addDays(weekStart, 7)
  ) {
    const weekEnd = addDays(weekStart, 6);
    const dates: string[] = [];

    for (let index = 0; index < 7; index += 1) {
      const currentDate = addDays(weekStart, index);

      if (currentDate.getTime() > endDate.getTime()) {
        break;
      }

      dates.push(formatChartDate(currentDate));
    }

    buckets.push({
      bucketEnd: formatChartDate(dates.length === 7 ? weekEnd : endDate),
      bucketStart: formatChartDate(weekStart),
      dates,
    });
  }

  return buckets;
}

function buildMonthBucketSpecs(
  dates: string[],
  toEpochSeconds: number | null,
) {
  const sortedDates = [...dates].sort((left, right) => left.localeCompare(right));
  const fallbackMonthDate =
    toEpochSeconds !== null
      ? getLocalDateAtUtcNoon(toEpochSeconds, ALMATY_TIME_ZONE)
      : parseChartDate(formatDateForTimeZone(new Date(), ALMATY_TIME_ZONE));
  const firstMonthStart =
    sortedDates.length > 0
      ? startOfMonth(parseChartDate(sortedDates[0]))
      : startOfMonth(fallbackMonthDate);
  const lastMonthStart =
    sortedDates.length > 0
      ? startOfMonth(parseChartDate(sortedDates[sortedDates.length - 1]))
      : startOfMonth(fallbackMonthDate);
  const buckets: ChartBucketSpec[] = [];

  for (
    let monthStart = new Date(firstMonthStart);
    monthStart.getTime() <= lastMonthStart.getTime();
    monthStart = addMonths(monthStart, 1)
  ) {
    const monthEnd = endOfMonth(monthStart);
    const monthDates: string[] = [];

    for (
      let cursor = new Date(monthStart);
      cursor.getTime() <= monthEnd.getTime();
      cursor = addDays(cursor, 1)
    ) {
      monthDates.push(formatChartDate(cursor));
    }

    buckets.push({
      bucketEnd: formatChartDate(monthEnd),
      bucketStart: formatChartDate(monthStart),
      dates: monthDates,
    });
  }

  return buckets;
}

function buildMonthBucketSpecsForRange(fromEpochSeconds: number, toEpochSeconds: number) {
  const startDate = startOfMonth(getLocalDateAtUtcNoon(fromEpochSeconds, ALMATY_TIME_ZONE));
  const endDate = startOfMonth(getLocalDateAtUtcNoon(toEpochSeconds, ALMATY_TIME_ZONE));
  const buckets: ChartBucketSpec[] = [];

  for (
    let monthStart = new Date(startDate);
    monthStart.getTime() <= endDate.getTime();
    monthStart = addMonths(monthStart, 1)
  ) {
    const monthEnd = endOfMonth(monthStart);
    const dates: string[] = [];

    for (
      let cursor = new Date(monthStart);
      cursor.getTime() <= monthEnd.getTime();
      cursor = addDays(cursor, 1)
    ) {
      dates.push(formatChartDate(cursor));
    }

    buckets.push({
      bucketEnd: formatChartDate(monthEnd),
      bucketStart: formatChartDate(monthStart),
      dates,
    });
  }

  return buckets;
}

function normalizeNewsSource(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : UNKNOWN_NEWS_SOURCE;
}

function sortNewsSources(sourceTotalsMap: Map<string, number>) {
  return [...sourceTotalsMap.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      if (left[0] === UNKNOWN_NEWS_SOURCE) {
        return 1;
      }

      if (right[0] === UNKNOWN_NEWS_SOURCE) {
        return -1;
      }

      return left[0].localeCompare(right[0], "en", { sensitivity: "base" });
    })
    .map(([source]) => source);
}

function getTopSources(sourceTotalsMap: Map<string, number>) {
  const sortedSources = sortNewsSources(sourceTotalsMap);
  const visibleSources = sortedSources.slice(0, MAX_VISIBLE_SOURCES);

  if (sortedSources.length <= MAX_VISIBLE_SOURCES) {
    return visibleSources;
  }

  return [...visibleSources, OTHER_NEWS_SOURCE];
}

function resolveEffectiveChartRange(
  input: NormalizedNewsQueryInput,
  now: Date = new Date(),
): EffectiveChartRange {
  const rawFromEpochSeconds = normalizeNewsEpochSecondsValue(input.from);
  const rawToEpochSeconds = normalizeNewsEpochSecondsValue(input.to);

  if (
    rawFromEpochSeconds !== null &&
    rawToEpochSeconds !== null &&
    rawFromEpochSeconds > rawToEpochSeconds
  ) {
    return {
      fromEpochSeconds: null,
      isOpenEndedToOnly: false,
      toEpochSeconds: null,
    };
  }

  const nowEpochSeconds = Math.floor(now.getTime() / 1000);

  if (rawFromEpochSeconds === null && rawToEpochSeconds === null) {
    const defaultFromEpochSeconds = parseDateTimeLocalValueToEpochSeconds(
      getDefaultNewsPageSearchFromValue(now),
    );

    return {
      fromEpochSeconds: defaultFromEpochSeconds,
      isOpenEndedToOnly: false,
      toEpochSeconds: nowEpochSeconds,
    };
  }

  if (rawFromEpochSeconds !== null && rawToEpochSeconds === null) {
    return {
      fromEpochSeconds: rawFromEpochSeconds,
      isOpenEndedToOnly: false,
      toEpochSeconds: nowEpochSeconds,
    };
  }

  if (rawFromEpochSeconds === null && rawToEpochSeconds !== null) {
    return {
      fromEpochSeconds: null,
      isOpenEndedToOnly: true,
      toEpochSeconds: rawToEpochSeconds,
    };
  }

  return {
    fromEpochSeconds: rawFromEpochSeconds,
    isOpenEndedToOnly: false,
    toEpochSeconds: rawToEpochSeconds,
  };
}

function getChartGranularity(range: EffectiveChartRange): NewsChartGranularity {
  if (
    range.isOpenEndedToOnly ||
    range.fromEpochSeconds === null ||
    range.toEpochSeconds === null
  ) {
    return "month";
  }

  const spanSeconds = Math.max(range.toEpochSeconds - range.fromEpochSeconds, 0);
  const dayThresholdSeconds = DAILY_GRANULARITY_DAYS * SECONDS_IN_DAY;
  const weekThresholdSeconds = WEEKLY_GRANULARITY_DAYS * SECONDS_IN_DAY;

  if (spanSeconds < dayThresholdSeconds) {
    return "day";
  }

  if (spanSeconds < weekThresholdSeconds) {
    return "week";
  }

  return "month";
}

function buildBucketSpecs(
  granularity: NewsChartGranularity,
  range: EffectiveChartRange,
  dates: string[],
) {
  if (granularity === "day" && range.fromEpochSeconds !== null && range.toEpochSeconds !== null) {
    return buildDayBucketSpecs(range.fromEpochSeconds, range.toEpochSeconds);
  }

  if (granularity === "week" && range.fromEpochSeconds !== null && range.toEpochSeconds !== null) {
    return buildWeekBucketSpecs(range.fromEpochSeconds, range.toEpochSeconds);
  }

  if (range.fromEpochSeconds !== null && range.toEpochSeconds !== null) {
    return buildMonthBucketSpecsForRange(range.fromEpochSeconds, range.toEpochSeconds);
  }

  return buildMonthBucketSpecs(dates, range.toEpochSeconds);
}

function buildBucketsFromSpecs(
  bucketSpecs: ChartBucketSpec[],
  dailySourceTotalsMap: Map<string, Map<string, number>>,
  sources: string[],
): NewsChartSourceBucket[] {
  const visibleSources = sources.filter((source) => source !== OTHER_NEWS_SOURCE);
  const visibleSourceSet = new Set(visibleSources);

  return bucketSpecs.map(({ bucketEnd, bucketStart, dates }) => {
    const sourceTotals = new Map<string, number>();
    let otherTotal = 0;

    for (const date of dates) {
      const dailySourceTotals = dailySourceTotalsMap.get(date);

      if (!dailySourceTotals) {
        continue;
      }

      for (const [source, total] of dailySourceTotals.entries()) {
        if (visibleSourceSet.has(source)) {
          sourceTotals.set(source, (sourceTotals.get(source) ?? 0) + total);
          continue;
        }

        otherTotal += total;
      }
    }

    const segments = sources
      .map((source) => ({
        source,
        total: source === OTHER_NEWS_SOURCE ? otherTotal : sourceTotals.get(source) ?? 0,
      }))
      .filter((segment) => segment.total > 0);
    const total = segments.reduce((sum, segment) => sum + segment.total, 0);

    return {
      bucketEnd,
      bucketStart,
      segments,
      total,
    };
  });
}

async function getNewsChartData(
  input: NormalizedNewsQueryInput,
): Promise<NewsChartSourceStats> {
  const rows = await manticoreSql<NewsChartCountRow>(
    `SELECT DATE(publishedat) AS bucket_date, source, COUNT(*) AS total FROM news${buildNewsWhereClause(input.query, input.sources, input.from, input.to)} GROUP BY bucket_date, source ORDER BY bucket_date ASC LIMIT 100000 OPTION max_matches=10000`,
  );
  const dailySourceTotalsMap = new Map<string, Map<string, number>>();
  const overallSourceTotals = new Map<string, number>();

  for (const row of rows) {
    const bucketDate = normalizeChartBucketDate(row.bucket_date);
    const source = normalizeNewsSource(row.source);
    const total = Number(row.total ?? 0);
    const dailySourceTotals = dailySourceTotalsMap.get(bucketDate) ?? new Map<string, number>();

    dailySourceTotals.set(source, (dailySourceTotals.get(source) ?? 0) + total);
    dailySourceTotalsMap.set(bucketDate, dailySourceTotals);
    overallSourceTotals.set(source, (overallSourceTotals.get(source) ?? 0) + total);
  }

  const effectiveRange = resolveEffectiveChartRange(input);
  const granularity = getChartGranularity(effectiveRange);
  const allDates = [...dailySourceTotalsMap.keys()];
  const sources = getTopSources(overallSourceTotals);
  const bucketSpecs = buildBucketSpecs(granularity, effectiveRange, allDates);

  return {
    buckets: buildBucketsFromSpecs(bucketSpecs, dailySourceTotalsMap, sources),
    granularity,
    sources,
  };
}

const getCachedNewsChart = unstable_cache(
  async (query: string, serializedSources: string, from: string, to: string) =>
    getNewsChartData({
      from,
      query,
      sources: serializedSources ? serializedSources.split("\u0000") : [],
      to,
    }),
  ["news-chart-v1"],
  {
    revalidate: ONE_HOUR_REVALIDATE,
    tags: ["news:chart"],
  },
);

export async function getNewsChart(input: NewsQueryInput) {
  const normalizedInput = normalizeNewsQueryInput(input);

  return getCachedNewsChart(
    normalizedInput.query,
    normalizedInput.sources.join("\u0000"),
    normalizedInput.from,
    normalizedInput.to,
  );
}
