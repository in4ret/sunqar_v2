import "server-only";

import { unstable_cache } from "next/cache";

import { manticoreSql } from "@/lib/manticore";

type CountRow = {
  total: number | string;
};

type AverageRow = {
  average: number | string | null;
};

type CommentsChartCountRow = {
  bucket_date: string;
  total: number | string;
};

type NewsChartCountRow = {
  bucket_date: string;
  total: number | string;
  type: string | null;
};

type ChartBucketSpec = {
  bucketEnd: string;
  bucketLabel: string;
  bucketStart: string;
  dates: string[];
};

export type HomePageCountStats = {
  total: number;
  today: number;
};

export type HomePageChartRange = "month-daily" | "six-months-weekly" | "all-time-monthly";

export type CommentsChartRange = HomePageChartRange;
export type NewsChartRange = HomePageChartRange;

export type HomePageCommentsChartBucket = {
  bucketEnd: string;
  bucketLabel: string;
  bucketStart: string;
  total: number;
};

export type HomePageCommentsChartStats = {
  [key in CommentsChartRange]: HomePageCommentsChartBucket[];
};

export type HomePageNewsChartSegment = {
  total: number;
  type: string;
};

export type HomePageNewsChartBucket = {
  bucketEnd: string;
  bucketLabel: string;
  bucketStart: string;
  segments: HomePageNewsChartSegment[];
  total: number;
};

export type HomePageNewsChartStats = {
  ranges: {
    [key in NewsChartRange]: HomePageNewsChartBucket[];
  };
  types: string[];
};

const ALMATY_TIME_ZONE = "Asia/Almaty";
const HOME_STATS_TTL = 60 * 60;
const HOME_CHART_DAYS = 30;
const HOME_CHART_MONTHS = 6;
const MIN_CHART_DATE = "1970-01-01";
const SECONDS_IN_DAY = 24 * 60 * 60;
const UNKNOWN_NEWS_TYPE = "__unknown__";

function escapeManticoreMatchValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function getMatchCondition(searchQuery: string) {
  if (!searchQuery) {
    return null;
  }

  return `MATCH('${escapeManticoreMatchValue(searchQuery)}')`;
}

function getWhereClause(searchQuery: string, conditions: string[] = []) {
  const matchCondition = getMatchCondition(searchQuery);
  const allConditions = matchCondition ? [matchCondition, ...conditions] : conditions;

  if (allConditions.length === 0) {
    return "";
  }

  return ` WHERE ${allConditions.join(" AND ")}`;
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

  const [, sign, hours, minutes = "0"] = match;
  const totalMinutes = Number(hours) * 60 + Number(minutes);

  return (sign === "+" ? 1 : -1) * totalMinutes * 60 * 1000;
}

function getStartOfDayEpochSeconds(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = getTimeZoneOffsetMilliseconds(new Date(utcMidnight), timeZone);

  return Math.floor((utcMidnight - offset) / 1000);
}

function formatDateForTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getChartDays(timeZone: string) {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), timeZone);

  return Array.from({ length: HOME_CHART_DAYS }, (_, index) => {
    const daysFromStart = HOME_CHART_DAYS - index - 1;
    const start = startOfToday - daysFromStart * SECONDS_IN_DAY;
    const end = start + SECONDS_IN_DAY;

    return {
      date: formatDateForTimeZone(new Date(start * 1000), timeZone),
      end,
      start,
    };
  });
}

function parseChartDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatChartDate(date: Date) {
  return formatDateForTimeZone(date, "UTC");
}

function normalizeChartBucketDate(value: string) {
  const trimmedValue = value.trim();
  const matchedDate = trimmedValue.match(/^\d{4}-\d{2}-\d{2}/);

  if (matchedDate) {
    return matchedDate[0];
  }

  return formatChartDate(new Date(trimmedValue));
}

function isChartDateWithinRange(value: string, timeZone: string) {
  const today = formatDateForTimeZone(new Date(), timeZone);

  return value >= MIN_CHART_DATE && value <= today;
}

function normalizeNewsType(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : UNKNOWN_NEWS_TYPE;
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

function startOfIsoWeek(date: Date) {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(date, diff);
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
}

function buildMonthDailyBucketSpecs(timeZone: string): ChartBucketSpec[] {
  return getChartDays(timeZone).map(({ date }) => ({
    bucketEnd: date,
    bucketLabel: date,
    bucketStart: date,
    dates: [date],
  }));
}

function buildSixMonthsWeeklyBucketSpecs(timeZone: string): ChartBucketSpec[] {
  const today = parseChartDate(formatDateForTimeZone(new Date(), timeZone));
  const rangeStart = startOfMonth(addMonths(today, -(HOME_CHART_MONTHS - 1)));
  const firstWeekStart = startOfIsoWeek(rangeStart);
  const currentWeekStart = startOfIsoWeek(today);
  const buckets: ChartBucketSpec[] = [];

  for (
    let weekStart = new Date(firstWeekStart);
    weekStart.getTime() <= currentWeekStart.getTime();
    weekStart = addDays(weekStart, 7)
  ) {
    const weekEnd = addDays(weekStart, 6);
    const dates = Array.from({ length: 7 }, (_, index) => formatChartDate(addDays(weekStart, index)));

    buckets.push({
      bucketEnd: formatChartDate(weekEnd),
      bucketLabel: formatChartDate(weekStart),
      bucketStart: formatChartDate(weekStart),
      dates,
    });
  }

  return buckets;
}

function buildAllTimeMonthlyBucketSpecs(dates: string[]): ChartBucketSpec[] {
  const sortedDates = [...dates].sort((left, right) => left.localeCompare(right));

  if (sortedDates.length === 0) {
    return [];
  }

  const firstMonthStart = startOfMonth(parseChartDate(sortedDates[0]));
  const currentMonthStart = startOfMonth(new Date());
  const buckets: ChartBucketSpec[] = [];

  for (
    let monthStart = new Date(firstMonthStart);
    monthStart.getTime() <= currentMonthStart.getTime();
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
      bucketLabel: formatChartDate(monthStart),
      bucketStart: formatChartDate(monthStart),
      dates: monthDates,
    });
  }

  return buckets;
}

function buildCommentsBucketsFromSpecs(
  bucketSpecs: ChartBucketSpec[],
  dailyTotalsMap: Map<string, number>
): HomePageCommentsChartBucket[] {
  return bucketSpecs.map(({ bucketEnd, bucketLabel, bucketStart, dates }) => ({
    bucketEnd,
    bucketLabel,
    bucketStart,
    total: dates.reduce((sum, date) => sum + (dailyTotalsMap.get(date) ?? 0), 0),
  }));
}

function getSortedNewsTypes(typeTotalsMap: Map<string, number>) {
  return [...typeTotalsMap.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      if (left[0] === UNKNOWN_NEWS_TYPE) {
        return 1;
      }

      if (right[0] === UNKNOWN_NEWS_TYPE) {
        return -1;
      }

      return left[0].localeCompare(right[0], "en", { sensitivity: "base" });
    })
    .map(([type]) => type);
}

function buildNewsBucketsFromSpecs(
  bucketSpecs: ChartBucketSpec[],
  dailyTypeTotalsMap: Map<string, Map<string, number>>,
  types: string[]
): HomePageNewsChartBucket[] {
  return bucketSpecs.map(({ bucketEnd, bucketLabel, bucketStart, dates }) => {
    const typeTotals = new Map<string, number>();

    for (const date of dates) {
      const dailyTypeTotals = dailyTypeTotalsMap.get(date);

      if (!dailyTypeTotals) {
        continue;
      }

      for (const [type, total] of dailyTypeTotals.entries()) {
        typeTotals.set(type, (typeTotals.get(type) ?? 0) + total);
      }
    }

    const segments = types
      .map((type) => ({
        total: typeTotals.get(type) ?? 0,
        type,
      }))
      .filter((segment) => segment.total > 0);
    const total = segments.reduce((sum, segment) => sum + segment.total, 0);

    return {
      bucketEnd,
      bucketLabel,
      bucketStart,
      segments,
      total,
    };
  });
}

function getEmptyCommentsChartStats(): HomePageCommentsChartStats {
  return {
    "all-time-monthly": [],
    "month-daily": buildCommentsBucketsFromSpecs(buildMonthDailyBucketSpecs(ALMATY_TIME_ZONE), new Map()),
    "six-months-weekly": buildCommentsBucketsFromSpecs(
      buildSixMonthsWeeklyBucketSpecs(ALMATY_TIME_ZONE),
      new Map()
    ),
  };
}

function getEmptyNewsChartStats(): HomePageNewsChartStats {
  return {
    ranges: {
      "all-time-monthly": [],
      "month-daily": buildNewsBucketsFromSpecs(
        buildMonthDailyBucketSpecs(ALMATY_TIME_ZONE),
        new Map(),
        []
      ),
      "six-months-weekly": buildNewsBucketsFromSpecs(
        buildSixMonthsWeeklyBucketSpecs(ALMATY_TIME_ZONE),
        new Map(),
        []
      ),
    },
    types: [],
  };
}

async function getNewsStats(searchQuery: string): Promise<HomePageCountStats> {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  const [totalRow, todayRow] = await Promise.all([
    manticoreSql<CountRow>(`SELECT COUNT(*) AS total FROM news${getWhereClause(searchQuery)}`),
    manticoreSql<CountRow>(
      `SELECT COUNT(*) AS total FROM news${getWhereClause(searchQuery, [
        `publishedat >= ${startOfToday}`,
        `publishedat < ${startOfNextDay}`,
      ])}`
    ),
  ]);

  return {
    total: Number(totalRow?.[0]?.total ?? 0),
    today: Number(todayRow?.[0]?.total ?? 0),
  };
}

async function getSourcesStats(searchQuery: string): Promise<HomePageCountStats> {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  const [totalRow, todayRow] = await Promise.all([
    manticoreSql<CountRow>(
      `SELECT COUNT(DISTINCT source) AS total FROM news${getWhereClause(searchQuery)}`
    ),
    manticoreSql<CountRow>(
      `SELECT COUNT(DISTINCT source) AS total FROM news${getWhereClause(searchQuery, [
        `publishedat >= ${startOfToday}`,
        `publishedat < ${startOfNextDay}`,
      ])}`
    ),
  ]);

  return {
    total: Number(totalRow?.[0]?.total ?? 0),
    today: Number(todayRow?.[0]?.total ?? 0),
  };
}

async function getCommentsStats(searchQuery: string): Promise<HomePageCountStats> {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  const [totalRow, todayRow] = await Promise.all([
    manticoreSql<CountRow>(`SELECT COUNT(*) AS total FROM comments${getWhereClause(searchQuery)}`),
    manticoreSql<CountRow>(
      `SELECT COUNT(*) AS total FROM comments${getWhereClause(searchQuery, [
        `publishedat >= ${startOfToday}`,
        `publishedat < ${startOfNextDay}`,
      ])}`
    ),
  ]);

  return {
    total: Number(totalRow?.[0]?.total ?? 0),
    today: Number(todayRow?.[0]?.total ?? 0),
  };
}

async function getCommentsToneAverageStats(searchQuery: string): Promise<HomePageCountStats> {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  const [totalRow, todayRow] = await Promise.all([
    manticoreSql<AverageRow>(`SELECT AVG(tone) AS average FROM comments${getWhereClause(searchQuery)}`),
    manticoreSql<AverageRow>(
      `SELECT AVG(tone) AS average FROM comments${getWhereClause(searchQuery, [
        `publishedat >= ${startOfToday}`,
        `publishedat < ${startOfNextDay}`,
      ])}`
    ),
  ]);

  return {
    total: Number(totalRow?.[0]?.average ?? 0),
    today: Number(todayRow?.[0]?.average ?? 0),
  };
}

async function getCommentsChartStats(searchQuery: string): Promise<HomePageCommentsChartStats> {
  const rows = await manticoreSql<CommentsChartCountRow>(
    `SELECT DATE(publishedat) AS bucket_date, COUNT(*) AS total FROM comments${getWhereClause(searchQuery)} GROUP BY bucket_date ORDER BY bucket_date ASC LIMIT 10000 OPTION max_matches=1000000`
  );
  const dailyTotalsMap = new Map(
    rows.map((row) => [normalizeChartBucketDate(row.bucket_date), Number(row.total ?? 0)] as const)
  );
  const allDates = [...dailyTotalsMap.keys()];

  return {
    "all-time-monthly": buildCommentsBucketsFromSpecs(
      buildAllTimeMonthlyBucketSpecs(allDates),
      dailyTotalsMap
    ),
    "month-daily": buildCommentsBucketsFromSpecs(
      buildMonthDailyBucketSpecs(ALMATY_TIME_ZONE),
      dailyTotalsMap
    ),
    "six-months-weekly": buildCommentsBucketsFromSpecs(
      buildSixMonthsWeeklyBucketSpecs(ALMATY_TIME_ZONE),
      dailyTotalsMap
    ),
  };
}

async function getNewsChartStats(searchQuery: string): Promise<HomePageNewsChartStats> {
  const rows = await manticoreSql<NewsChartCountRow>(
    `SELECT DATE(publishedat) AS bucket_date, type, COUNT(*) AS total FROM news${getWhereClause(searchQuery)} GROUP BY bucket_date, type ORDER BY bucket_date ASC LIMIT 100000 OPTION max_matches=1000000`
  );
  const dailyTypeTotalsMap = new Map<string, Map<string, number>>();
  const overallTypeTotals = new Map<string, number>();

  for (const row of rows) {
    const bucketDate = normalizeChartBucketDate(row.bucket_date);

    if (!isChartDateWithinRange(bucketDate, ALMATY_TIME_ZONE)) {
      continue;
    }

    const type = normalizeNewsType(row.type);
    const total = Number(row.total ?? 0);
    const dailyTypeTotals = dailyTypeTotalsMap.get(bucketDate) ?? new Map<string, number>();

    dailyTypeTotals.set(type, (dailyTypeTotals.get(type) ?? 0) + total);
    dailyTypeTotalsMap.set(bucketDate, dailyTypeTotals);
    overallTypeTotals.set(type, (overallTypeTotals.get(type) ?? 0) + total);
  }

  const allDates = [...dailyTypeTotalsMap.keys()];
  const types = getSortedNewsTypes(overallTypeTotals);

  return {
    ranges: {
      "all-time-monthly": buildNewsBucketsFromSpecs(
        buildAllTimeMonthlyBucketSpecs(allDates),
        dailyTypeTotalsMap,
        types
      ),
      "month-daily": buildNewsBucketsFromSpecs(
        buildMonthDailyBucketSpecs(ALMATY_TIME_ZONE),
        dailyTypeTotalsMap,
        types
      ),
      "six-months-weekly": buildNewsBucketsFromSpecs(
        buildSixMonthsWeeklyBucketSpecs(ALMATY_TIME_ZONE),
        dailyTypeTotalsMap,
        types
      ),
    },
    types,
  };
}

const getCachedHomePageNewsStats = unstable_cache(
  async (searchQuery: string) => getNewsStats(searchQuery),
  ["home-page-stats", "news"],
  {
    revalidate: HOME_STATS_TTL,
    tags: ["home-page-stats:news"],
  }
);

const getCachedHomePageSourcesStats = unstable_cache(
  async (searchQuery: string) => getSourcesStats(searchQuery),
  ["home-page-stats", "sources"],
  {
    revalidate: HOME_STATS_TTL,
    tags: ["home-page-stats:sources"],
  }
);

const getCachedHomePageCommentsStats = unstable_cache(
  async (searchQuery: string) => getCommentsStats(searchQuery),
  ["home-page-stats", "comments"],
  {
    revalidate: HOME_STATS_TTL,
    tags: ["home-page-stats:comments"],
  }
);

const getCachedHomePageCommentsToneAverageStats = unstable_cache(
  async (searchQuery: string) => getCommentsToneAverageStats(searchQuery),
  ["home-page-stats", "comments-tone-average"],
  {
    revalidate: HOME_STATS_TTL,
    tags: ["home-page-stats:comments-tone-average"],
  }
);

const getCachedHomePageCommentsChartStats = unstable_cache(
  async (searchQuery: string) => getCommentsChartStats(searchQuery),
  ["home-page-stats", "comments-chart-v3"],
  {
    revalidate: HOME_STATS_TTL,
    tags: ["home-page-stats:comments-chart-v3"],
  }
);

const getCachedHomePageNewsChartStats = unstable_cache(
  async (searchQuery: string) => getNewsChartStats(searchQuery),
  ["home-page-stats", "news-chart-v1"],
  {
    revalidate: HOME_STATS_TTL,
    tags: ["home-page-stats:news-chart-v1"],
  }
);

export async function getHomePageNewsStats(searchQuery: string): Promise<HomePageCountStats> {
  try {
    return await getCachedHomePageNewsStats(searchQuery);
  } catch (error) {
    console.error("Failed to load news stats from Manticore.", error);

    return {
      total: 0,
      today: 0,
    };
  }
}

export async function getHomePageSourcesStats(searchQuery: string): Promise<HomePageCountStats> {
  try {
    return await getCachedHomePageSourcesStats(searchQuery);
  } catch (error) {
    console.error("Failed to load source stats from Manticore.", error);

    return {
      total: 0,
      today: 0,
    };
  }
}

export async function getHomePageCommentsStats(searchQuery: string): Promise<HomePageCountStats> {
  try {
    return await getCachedHomePageCommentsStats(searchQuery);
  } catch (error) {
    console.error("Failed to load comments stats from Manticore.", error);

    return {
      total: 0,
      today: 0,
    };
  }
}

export async function getHomePageCommentsToneAverageStats(
  searchQuery: string
): Promise<HomePageCountStats> {
  try {
    return await getCachedHomePageCommentsToneAverageStats(searchQuery);
  } catch (error) {
    console.error("Failed to load comments tone average stats from Manticore.", error);

    return {
      total: 0,
      today: 0,
    };
  }
}

export async function getHomePageCommentsChartStats(
  searchQuery: string
): Promise<HomePageCommentsChartStats> {
  try {
    return await getCachedHomePageCommentsChartStats(searchQuery);
  } catch (error) {
    console.error("Failed to load comment chart stats from Manticore.", error);

    return getEmptyCommentsChartStats();
  }
}

export async function getHomePageNewsChartStats(
  searchQuery: string
): Promise<HomePageNewsChartStats> {
  try {
    return await getCachedHomePageNewsChartStats(searchQuery);
  } catch (error) {
    console.error("Failed to load news chart stats from Manticore.", error);

    return getEmptyNewsChartStats();
  }
}

export { UNKNOWN_NEWS_TYPE };
