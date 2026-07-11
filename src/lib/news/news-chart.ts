import "server-only";

import { unstable_cache } from "next/cache";

import { ONE_HOUR_REVALIDATE } from "@/lib/cache";
import { manticoreSql } from "@/lib/manticore";
import {
  type NewsChartAggregation,
  type NewsChartBucket,
  type NewsChartGranularity,
  type NewsChartStats,
  OTHER_NEWS_SOURCE,
  UNKNOWN_NEWS_COUNTRY,
  UNKNOWN_NEWS_SOURCE,
} from "@/lib/news/news-chart-shared";
import {
  buildNewsWhereClause,
  type NewsQueryInput,
  type NormalizedNewsQueryInput,
  normalizeNewsEpochSecondsValue,
  normalizeNewsQueryInput,
  resolveNewsAggregateExecutionMode,
} from "@/lib/news/news-filters";
import {
  getDefaultNewsPageSearchFromValue,
  parseDateTimeLocalValueToEpochSeconds,
} from "@/lib/utils";

type NewsChartCountRow = {
  country?: string | null;
  source?: string | null;
  total: number | string;
};

type NewsChartBoundaryRow = {
  publishedat: number | string | null;
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

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const timeZoneName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = timeZoneName?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  return sign * ((hours * 60 + minutes) * 60 * 1000);
}

function getStartOfDayEpochSeconds(value: string, timeZone: string) {
  const [year, month, day] = value.split("-").map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = getTimeZoneOffsetMilliseconds(new Date(utcMidnight), timeZone);

  return Math.floor((utcMidnight - offset) / 1000);
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

function normalizeNewsCountry(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : UNKNOWN_NEWS_COUNTRY;
}

function sortChartItems(itemTotalsMap: Map<string, number>, unknownItem: string) {
  return [...itemTotalsMap.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      if (left[0] === unknownItem) {
        return 1;
      }

      if (right[0] === unknownItem) {
        return -1;
      }

      return left[0].localeCompare(right[0], "en", {
        sensitivity: "base",
      });
    })
    .map(([item]) => item);
}

function getTopSources(sourceTotalsMap: Map<string, number>) {
  const sortedSources = sortChartItems(sourceTotalsMap, UNKNOWN_NEWS_SOURCE);
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

function getBucketStartEpochSeconds(bucket: ChartBucketSpec) {
  return getStartOfDayEpochSeconds(bucket.bucketStart, ALMATY_TIME_ZONE);
}

function getBucketEndExclusiveEpochSeconds(bucket: ChartBucketSpec) {
  const nextDate = formatChartDate(addDays(parseChartDate(bucket.bucketEnd), 1));

  return getStartOfDayEpochSeconds(nextDate, ALMATY_TIME_ZONE);
}

function normalizePublishedAtEpochSeconds(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const epochSeconds = Number(trimmedValue);

  return Number.isFinite(epochSeconds) ? epochSeconds : null;
}

async function getChartBoundaryDates(input: NormalizedNewsQueryInput, fallbackToEpochSeconds: number | null) {
  const whereClause = buildNewsWhereClause(input.query, input.sources, input.from, input.to);
  const [firstRows, lastRows] = await Promise.all([
    manticoreSql<NewsChartBoundaryRow>(
      `SELECT publishedat FROM news${whereClause} ORDER BY publishedat ASC LIMIT 1 OPTION max_matches=10000`,
    ),
    manticoreSql<NewsChartBoundaryRow>(
      `SELECT publishedat FROM news${whereClause} ORDER BY publishedat DESC LIMIT 1 OPTION max_matches=10000`,
    ),
  ]);
  const firstEpochSeconds = normalizePublishedAtEpochSeconds(firstRows[0]?.publishedat);
  const lastEpochSeconds = normalizePublishedAtEpochSeconds(lastRows[0]?.publishedat);

  if (firstEpochSeconds === null || lastEpochSeconds === null) {
    const fallbackDate =
      fallbackToEpochSeconds !== null
        ? getLocalDateAtUtcNoon(fallbackToEpochSeconds, ALMATY_TIME_ZONE)
        : parseChartDate(formatDateForTimeZone(new Date(), ALMATY_TIME_ZONE));

    return [formatChartDate(fallbackDate)];
  }

  return [
    formatChartDate(getLocalDateAtUtcNoon(firstEpochSeconds, ALMATY_TIME_ZONE)),
    formatChartDate(getLocalDateAtUtcNoon(lastEpochSeconds, ALMATY_TIME_ZONE)),
  ];
}

async function getBucketSourceTotals(
  input: NormalizedNewsQueryInput,
  bucket: ChartBucketSpec,
  aggregation: NewsChartAggregation,
) {
  const bucketStartEpochSeconds = getBucketStartEpochSeconds(bucket);
  const bucketEndExclusiveEpochSeconds = getBucketEndExclusiveEpochSeconds(bucket);
  const groupField = aggregation === "countries" ? "country" : "source";
  const rows = await manticoreSql<NewsChartCountRow>(
    `SELECT ${groupField}, COUNT(*) AS total FROM news${buildNewsWhereClause(input.query, input.sources, input.from, input.to, [
      `publishedat >= ${bucketStartEpochSeconds}`,
      `publishedat < ${bucketEndExclusiveEpochSeconds}`,
    ])} GROUP BY ${groupField} ORDER BY total DESC LIMIT 100000 OPTION max_matches=10000`,
  );
  const sourceTotals = new Map<string, number>();

  for (const row of rows) {
    const source =
      aggregation === "countries"
        ? normalizeNewsCountry(row.country)
        : normalizeNewsSource(row.source);
    const total = Number(row.total ?? 0);

    sourceTotals.set(source, (sourceTotals.get(source) ?? 0) + total);
  }

  return sourceTotals;
}

function buildBucketsFromSpecs(
  bucketSpecs: ChartBucketSpec[],
  bucketSourceTotalsMap: Map<string, Map<string, number>>,
  items: string[],
  aggregation: NewsChartAggregation,
): NewsChartBucket[] {
  const visibleSources =
    aggregation === "sources"
      ? items.filter((source) => source !== OTHER_NEWS_SOURCE)
      : items;
  const visibleSourceSet = new Set(visibleSources);

  return bucketSpecs.map(({ bucketEnd, bucketStart }) => {
    const sourceTotals = new Map<string, number>();
    let otherTotal = 0;
    const bucketSourceTotals = bucketSourceTotalsMap.get(bucketStart);

    if (bucketSourceTotals) {
      for (const [source, total] of bucketSourceTotals.entries()) {
        if (visibleSourceSet.has(source)) {
          sourceTotals.set(source, (sourceTotals.get(source) ?? 0) + total);
          continue;
        }

        otherTotal += total;
      }
    }

    const segments = items
      .map((source) => ({
        key: source,
        total:
          aggregation === "sources" && source === OTHER_NEWS_SOURCE
            ? otherTotal
            : sourceTotals.get(source) ?? 0,
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
): Promise<NewsChartStats> {
  const effectiveRange = resolveEffectiveChartRange(input);
  const granularity = getChartGranularity(effectiveRange);
  const boundaryDates =
    effectiveRange.fromEpochSeconds === null || effectiveRange.toEpochSeconds === null
      ? await getChartBoundaryDates(input, effectiveRange.toEpochSeconds)
      : [];
  const bucketSpecs = buildBucketSpecs(granularity, effectiveRange, boundaryDates);
  const bucketSourceTotalsMap = new Map<string, Map<string, number>>();
  const overallSourceTotals = new Map<string, number>();

  await Promise.all(
    bucketSpecs.map(async (bucket) => {
      const bucketSourceTotals = await getBucketSourceTotals(input, bucket, input.aggregation);

      bucketSourceTotalsMap.set(bucket.bucketStart, bucketSourceTotals);

      for (const [source, total] of bucketSourceTotals.entries()) {
        overallSourceTotals.set(source, (overallSourceTotals.get(source) ?? 0) + total);
      }
    }),
  );

  const items =
    input.aggregation === "countries"
      ? sortChartItems(overallSourceTotals, UNKNOWN_NEWS_COUNTRY)
      : getTopSources(overallSourceTotals);

  return {
    aggregation: input.aggregation,
    buckets: buildBucketsFromSpecs(bucketSpecs, bucketSourceTotalsMap, items, input.aggregation),
    granularity,
    items,
  };
}

export function resolveNewsChartExecutionMode(input: Pick<NormalizedNewsQueryInput, "to">) {
  return resolveNewsAggregateExecutionMode(input);
}

const getCachedNewsChart = unstable_cache(
  async (
    aggregation: NewsChartAggregation,
    query: string,
    serializedSources: string,
    from: string,
    to: string,
  ) =>
    getNewsChartData({
      aggregation,
      from,
      query,
      sources: serializedSources ? serializedSources.split("\u0000") : [],
      to,
    }),
  ["news-chart-v2"],
  {
    revalidate: ONE_HOUR_REVALIDATE,
    tags: ["news:chart"],
  },
);

export async function getNewsChart(input: NewsQueryInput) {
  const normalizedInput = normalizeNewsQueryInput(input);

  if (resolveNewsChartExecutionMode(normalizedInput) === "direct") {
    return getNewsChartData(normalizedInput);
  }

  return getCachedNewsChart(
    normalizedInput.aggregation,
    normalizedInput.query,
    normalizedInput.sources.join("\u0000"),
    normalizedInput.from,
    normalizedInput.to,
  );
}
