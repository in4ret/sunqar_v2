import "server-only";

import crypto from "node:crypto";

import { ONE_HOUR_REVALIDATE, swrCache } from "@/lib/cache";
import {
  type HomePageNewsCountryChartSlice,
  type HomePageNewsCountryChartStats,
  UNKNOWN_NEWS_COUNTRY,
} from "@/lib/home-page-stats-shared";
import { formatLogMessage } from "@/lib/logs";
import { manticoreSql } from "@/lib/manticore";
import type { ReportBlocks } from "@/lib/reports";

type CountRow = {
  total: number | string;
};

type AverageRow = {
  average: number | string | null;
};

type CommentsChartCountRow = {
  bucket_date: string;
  source: string | null;
  total: number | string;
};

type NewsChartCountRow = {
  bucket_date: string;
  total: number | string;
  type: string | null;
};

type NewsCountryChartCountRow = {
  country: string | null;
  total: number | string;
};

type ReportTrendCountRow = {
  bucket_date: string;
  total: number | string;
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

export type HomePageCommentsChartSegment = {
  source: string;
  total: number;
};

export type HomePageCommentsChartBucket = {
  bucketEnd: string;
  bucketLabel: string;
  bucketStart: string;
  segments: HomePageCommentsChartSegment[];
  total: number;
};

export type HomePageCommentsChartStats = {
  ranges: {
    [key in CommentsChartRange]: HomePageCommentsChartBucket[];
  };
  sources: string[];
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

export type HomePageReportTrendBucket = {
  bucketEnd: string;
  bucketLabel: string;
  bucketStart: string;
};

export type HomePageReportTrendPoint = {
  bucketStart: string;
  total: number;
};

export type HomePageReportTrendSeries = {
  blockTitle: string;
  colorIndex: number;
  points: HomePageReportTrendPoint[];
};

export type HomePageReportTrendRangeStats = {
  buckets: HomePageReportTrendBucket[];
  series: HomePageReportTrendSeries[];
};

export type HomePageReportTrendStats = {
  reportId: string;
  ranges: {
    [key in HomePageChartRange]: HomePageReportTrendRangeStats;
  };
};

type HomePageReportTrendInput = {
  blocks: ReportBlocks;
  reportId: string;
};

const ALMATY_TIME_ZONE = "Asia/Almaty";
const HOME_CHART_DAYS = 30;
const HOME_CHART_MONTHS = 6;
const MIN_CHART_DATE = "1970-01-01";
const SECONDS_IN_DAY = 24 * 60 * 60;
const UNKNOWN_COMMENT_SOURCE = "__unknown__";
const UNKNOWN_NEWS_TYPE = "__unknown__";

function escapeManticoreMatchValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function escapeSqlStringValue(value: string) {
  return value.replaceAll("'", "\\'");
}

function escapeManticoreKeywordValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("'", "\\'");
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

function normalizeCommentSource(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : UNKNOWN_COMMENT_SOURCE;
}

function normalizeNewsCountry(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : UNKNOWN_NEWS_COUNTRY;
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
  dailySourceTotalsMap: Map<string, Map<string, number>>,
  sources: string[]
): HomePageCommentsChartBucket[] {
  return bucketSpecs.map(({ bucketEnd, bucketLabel, bucketStart, dates }) => {
    const sourceTotals = new Map<string, number>();

    for (const date of dates) {
      const dailySourceTotals = dailySourceTotalsMap.get(date);

      if (!dailySourceTotals) {
        continue;
      }

      for (const [source, total] of dailySourceTotals.entries()) {
        sourceTotals.set(source, (sourceTotals.get(source) ?? 0) + total);
      }
    }

    const segments = sources
      .map((source) => ({
        source,
        total: sourceTotals.get(source) ?? 0,
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

function getSortedCommentSources(sourceTotalsMap: Map<string, number>) {
  return [...sourceTotalsMap.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      if (left[0] === UNKNOWN_COMMENT_SOURCE) {
        return 1;
      }

      if (right[0] === UNKNOWN_COMMENT_SOURCE) {
        return -1;
      }

      return left[0].localeCompare(right[0], "en", { sensitivity: "base" });
    })
    .map(([source]) => source);
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
    ranges: {
      "all-time-monthly": [],
      "month-daily": buildCommentsBucketsFromSpecs(
        buildMonthDailyBucketSpecs(ALMATY_TIME_ZONE),
        new Map(),
        []
      ),
      "six-months-weekly": buildCommentsBucketsFromSpecs(
        buildSixMonthsWeeklyBucketSpecs(ALMATY_TIME_ZONE),
        new Map(),
        []
      ),
    },
    sources: [],
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

function getEmptyNewsCountryChartStats(): HomePageNewsCountryChartStats {
  return {
    slices: [],
  };
}

function getEmptyReportTrendStats(reportId: string): HomePageReportTrendStats {
  return {
    reportId,
    ranges: {
      "all-time-monthly": {
        buckets: [],
        series: [],
      },
      "month-daily": {
        buckets: buildMonthDailyBucketSpecs(ALMATY_TIME_ZONE).map(
          ({ bucketEnd, bucketLabel, bucketStart }) => ({
            bucketEnd,
            bucketLabel,
            bucketStart,
          })
        ),
        series: [],
      },
      "six-months-weekly": {
        buckets: buildSixMonthsWeeklyBucketSpecs(ALMATY_TIME_ZONE).map(
          ({ bucketEnd, bucketLabel, bucketStart }) => ({
            bucketEnd,
            bucketLabel,
            bucketStart,
          })
        ),
        series: [],
      },
    },
  };
}

function buildReportTrendQueryKeywords(blockKeywords: string[]) {
  const normalizedKeywords = blockKeywords.map((keyword) => keyword.trim()).filter(Boolean);

  if (normalizedKeywords.length === 0) {
    return null;
  }

  return normalizedKeywords.map((keyword) => `"${escapeManticoreKeywordValue(keyword)}"`).join(" | ");
}

function buildReportTrendSourceCondition(blockSources: string[]) {
  const normalizedSources = blockSources.map((source) => source.trim()).filter(Boolean);

  if (normalizedSources.length === 0) {
    return null;
  }

  const sourceValues = normalizedSources.map((source) => `'${escapeSqlStringValue(source)}'`);

  return `source IN (${sourceValues.join(", ")})`;
}

function createReportTrendSeries(
  blockTitle: string,
  colorIndex: number,
  bucketSpecs: ChartBucketSpec[],
  dailyTotalsMap: Map<string, number>
) {
  return {
    blockTitle,
    colorIndex,
    points: bucketSpecs.map(({ bucketStart, dates }) => ({
      bucketStart,
      total: dates.reduce((sum, date) => sum + (dailyTotalsMap.get(date) ?? 0), 0),
    })),
  };
}

function createReportTrendRangeStats(
  bucketSpecs: ChartBucketSpec[],
  blockSeriesEntries: Array<{
    colorIndex: number;
    dailyTotalsMap: Map<string, number>;
    title: string;
  }>
): HomePageReportTrendRangeStats {
  return {
    buckets: bucketSpecs.map(({ bucketEnd, bucketLabel, bucketStart }) => ({
      bucketEnd,
      bucketLabel,
      bucketStart,
    })),
    series: blockSeriesEntries.map((entry) =>
      createReportTrendSeries(entry.title, entry.colorIndex, bucketSpecs, entry.dailyTotalsMap)
    ),
  };
}

function getReportTrendCacheSignature(reportItems: HomePageReportTrendInput[]) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        reportItems.map((report) => ({
          blocks: report.blocks.map((block) => ({
            keywords: block.keywords,
            sources: block.sources,
            title: block.title,
          })),
          reportId: report.reportId,
        }))
      )
    )
    .digest("hex");
}

async function getReportTrendStats(
  reportItems: HomePageReportTrendInput[]
): Promise<HomePageReportTrendStats[]> {
  const reportSeriesEntries = await Promise.all(
    reportItems.map(async (report) => {
      const blockSeriesEntries = await Promise.all(
        report.blocks.map(async (block, index) => {
          const matchExpression = buildReportTrendQueryKeywords(block.keywords);
          const sourceCondition = buildReportTrendSourceCondition(block.sources);

          if (!matchExpression || !sourceCondition) {
            return {
              colorIndex: index % 3,
              dailyTotalsMap: new Map<string, number>(),
              title: block.title,
            };
          }

          const rows = await manticoreSql<ReportTrendCountRow>(
            `SELECT DATE(publishedat) AS bucket_date, COUNT(*) AS total FROM news${getWhereClause(
              matchExpression,
              [sourceCondition]
            )} GROUP BY bucket_date ORDER BY bucket_date ASC LIMIT 100000 OPTION max_matches=10000`
          );
          const dailyTotalsMap = new Map<string, number>();

          for (const row of rows) {
            const bucketDate = normalizeChartBucketDate(row.bucket_date);

            if (!isChartDateWithinRange(bucketDate, ALMATY_TIME_ZONE)) {
              continue;
            }

            dailyTotalsMap.set(bucketDate, Number(row.total ?? 0));
          }

          return {
            colorIndex: index % 3,
            dailyTotalsMap,
            title: block.title,
          };
        })
      );

      const fullTrendDates = new Set<string>();

      for (const entry of blockSeriesEntries) {
        for (const date of entry.dailyTotalsMap.keys()) {
          fullTrendDates.add(date);
        }
      }

      const sortedTrendDates = [...fullTrendDates].sort((left, right) => left.localeCompare(right));
      const allTimeBucketSpecs =
        sortedTrendDates.length > 0 ? buildAllTimeMonthlyBucketSpecs(sortedTrendDates) : [];

      return {
        allTimeBucketSpecs,
        blockSeriesEntries,
        reportId: report.reportId,
      };
    })
  );

  return reportSeriesEntries.map(({ allTimeBucketSpecs, blockSeriesEntries, reportId }) => ({
    reportId,
    ranges: {
      "all-time-monthly": createReportTrendRangeStats(allTimeBucketSpecs, blockSeriesEntries),
      "month-daily": createReportTrendRangeStats(
        buildMonthDailyBucketSpecs(ALMATY_TIME_ZONE),
        blockSeriesEntries
      ),
      "six-months-weekly": createReportTrendRangeStats(
        buildSixMonthsWeeklyBucketSpecs(ALMATY_TIME_ZONE),
        blockSeriesEntries
      ),
    },
  }));
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
    manticoreSql<AverageRow>(`SELECT AVG(toxic) AS average FROM comments${getWhereClause(searchQuery)}`),
    manticoreSql<AverageRow>(
      `SELECT AVG(toxic) AS average FROM comments${getWhereClause(searchQuery, [
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
    `SELECT DATE(publishedat) AS bucket_date, source, COUNT(*) AS total FROM comments${getWhereClause(searchQuery)} GROUP BY bucket_date, source ORDER BY bucket_date ASC LIMIT 100000 OPTION max_matches=10000`
  );
  const dailySourceTotalsMap = new Map<string, Map<string, number>>();
  const overallSourceTotals = new Map<string, number>();

  for (const row of rows) {
    const bucketDate = normalizeChartBucketDate(row.bucket_date);

    if (!isChartDateWithinRange(bucketDate, ALMATY_TIME_ZONE)) {
      continue;
    }

    const source = normalizeCommentSource(row.source);
    const total = Number(row.total ?? 0);
    const dailySourceTotals = dailySourceTotalsMap.get(bucketDate) ?? new Map<string, number>();

    dailySourceTotals.set(source, (dailySourceTotals.get(source) ?? 0) + total);
    dailySourceTotalsMap.set(bucketDate, dailySourceTotals);
    overallSourceTotals.set(source, (overallSourceTotals.get(source) ?? 0) + total);
  }

  const allDates = [...dailySourceTotalsMap.keys()];
  const sources = getSortedCommentSources(overallSourceTotals);

  return {
    ranges: {
      "all-time-monthly": buildCommentsBucketsFromSpecs(
        buildAllTimeMonthlyBucketSpecs(allDates),
        dailySourceTotalsMap,
        sources
      ),
      "month-daily": buildCommentsBucketsFromSpecs(
        buildMonthDailyBucketSpecs(ALMATY_TIME_ZONE),
        dailySourceTotalsMap,
        sources
      ),
      "six-months-weekly": buildCommentsBucketsFromSpecs(
        buildSixMonthsWeeklyBucketSpecs(ALMATY_TIME_ZONE),
        dailySourceTotalsMap,
        sources
      ),
    },
    sources,
  };
}

async function getNewsChartStats(searchQuery: string): Promise<HomePageNewsChartStats> {
  const rows = await manticoreSql<NewsChartCountRow>(
    `SELECT DATE(publishedat) AS bucket_date, type, COUNT(*) AS total FROM news${getWhereClause(searchQuery)} GROUP BY bucket_date, type ORDER BY bucket_date ASC LIMIT 100000 OPTION max_matches=10000`
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

async function getNewsCountryChartStats(searchQuery: string): Promise<HomePageNewsCountryChartStats> {
  const rows = await manticoreSql<NewsCountryChartCountRow>(
    `SELECT country, COUNT(*) AS total FROM news${getWhereClause(searchQuery)} GROUP BY country ORDER BY total DESC LIMIT 100000 OPTION max_matches=10000`
  );
  const countryTotals = new Map<string, number>();

  for (const row of rows) {
    const country = normalizeNewsCountry(row.country);
    const total = Number(row.total ?? 0);

    if (total <= 0) {
      continue;
    }

    countryTotals.set(country, (countryTotals.get(country) ?? 0) + total);
  }

  const sortedCountries = [...countryTotals.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    if (left[0] === UNKNOWN_NEWS_COUNTRY) {
      return 1;
    }

    if (right[0] === UNKNOWN_NEWS_COUNTRY) {
      return -1;
    }

    return left[0].localeCompare(right[0], "en", { sensitivity: "base" });
  });
  const unknownTotal = countryTotals.get(UNKNOWN_NEWS_COUNTRY) ?? 0;
  const slices: HomePageNewsCountryChartSlice[] = sortedCountries
    .filter(([country]) => country !== UNKNOWN_NEWS_COUNTRY)
    .map(([country, total]) => ({
      country,
      total,
    }));

  if (unknownTotal > 0) {
    slices.push({
      country: UNKNOWN_NEWS_COUNTRY,
      total: unknownTotal,
    });
  }

  return {
    slices,
  };
}

const getCachedHomePageNewsStats = swrCache(async (searchQuery: string) => getNewsStats(searchQuery), {
  getKeyArgs: (searchQuery: string) => [searchQuery],
  keyParts: ["home-page-stats", "news"],
  maxAgeSeconds: ONE_HOUR_REVALIDATE,
  onRefreshError(error) {
    console.error(formatLogMessage("Failed to refresh cached news stats from Manticore."), error);
  },
});

const getCachedHomePageSourcesStats = swrCache(
  async (searchQuery: string) => getSourcesStats(searchQuery),
  {
    getKeyArgs: (searchQuery: string) => [searchQuery],
    keyParts: ["home-page-stats", "sources"],
    maxAgeSeconds: ONE_HOUR_REVALIDATE,
    onRefreshError(error) {
      console.error(formatLogMessage("Failed to refresh cached source stats from Manticore."), error);
    },
  }
);

const getCachedHomePageCommentsStats = swrCache(
  async (searchQuery: string) => getCommentsStats(searchQuery),
  {
    getKeyArgs: (searchQuery: string) => [searchQuery],
    keyParts: ["home-page-stats", "comments"],
    maxAgeSeconds: ONE_HOUR_REVALIDATE,
    onRefreshError(error) {
      console.error(formatLogMessage("Failed to refresh cached comments stats from Manticore."), error);
    },
  }
);

const getCachedHomePageCommentsToneAverageStats = swrCache(
  async (searchQuery: string) => getCommentsToneAverageStats(searchQuery),
  {
    getKeyArgs: (searchQuery: string) => [searchQuery],
    keyParts: ["home-page-stats", "comments-tone-average"],
    maxAgeSeconds: ONE_HOUR_REVALIDATE,
    onRefreshError(error) {
      console.error(formatLogMessage("Failed to refresh cached comments tone average stats from Manticore."), error);
    },
  }
);

const getCachedHomePageCommentsChartStats = swrCache(
  async (searchQuery: string) => getCommentsChartStats(searchQuery),
  {
    getKeyArgs: (searchQuery: string) => [searchQuery],
    keyParts: ["home-page-stats", "comments-chart"],
    maxAgeSeconds: ONE_HOUR_REVALIDATE,
    onRefreshError(error) {
      console.error(formatLogMessage("Failed to refresh cached comments chart stats from Manticore."), error);
    },
  });

const getCachedHomePageNewsChartStats = swrCache(
  async (searchQuery: string) => getNewsChartStats(searchQuery),
  {
    getKeyArgs: (searchQuery: string) => [searchQuery],
    keyParts: ["home-page-stats", "news-chart"],
    maxAgeSeconds: ONE_HOUR_REVALIDATE,
    onRefreshError(error) {
      console.error(formatLogMessage("Failed to refresh cached news chart stats from Manticore."), error);
    },
  });

const getCachedHomePageNewsCountryChartStats = swrCache(
  async (searchQuery: string) => getNewsCountryChartStats(searchQuery),
  {
    getKeyArgs: (searchQuery: string) => [searchQuery],
    keyParts: ["home-page-stats", "news-country-chart"],
    maxAgeSeconds: ONE_HOUR_REVALIDATE,
    onRefreshError(error) {
      console.error(formatLogMessage("Failed to refresh cached news country chart stats from Manticore."), error);
    },
  }
);

const getCachedHomePageReportTrendStats = swrCache(
  async (
    userId: string,
    reportItems: HomePageReportTrendInput[],
    reportItemsSignature: string
  ) => {
    void userId;
    void reportItemsSignature;

    return getReportTrendStats(reportItems);
  },
  {
    getKeyArgs: (userId: string, _reportItems: HomePageReportTrendInput[], reportItemsSignature: string) => [
      userId,
      reportItemsSignature,
    ],
    keyParts: ["home-page-stats", "report-trend"],
    maxAgeSeconds: ONE_HOUR_REVALIDATE,
    onRefreshError(error) {
      console.error(formatLogMessage("Failed to refresh cached report trend stats from Manticore."), error);
    },
  }
);

export async function getHomePageNewsStats(searchQuery: string): Promise<HomePageCountStats> {
  try {
    return await getCachedHomePageNewsStats(searchQuery);
  } catch (error) {
    console.error(formatLogMessage("Failed to load news stats from Manticore."), error);

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
    console.error(formatLogMessage("Failed to load source stats from Manticore."), error);

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
    console.error(formatLogMessage("Failed to load comments stats from Manticore."), error);

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
    console.error(formatLogMessage("Failed to load comments tone average stats from Manticore."), error);

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
    console.error(formatLogMessage("Failed to load comment chart stats from Manticore."), error);

    return getEmptyCommentsChartStats();
  }
}

export async function getHomePageNewsChartStats(
  searchQuery: string
): Promise<HomePageNewsChartStats> {
  try {
    return await getCachedHomePageNewsChartStats(searchQuery);
  } catch (error) {
    console.error(formatLogMessage("Failed to load news chart stats from Manticore."), error);

    return getEmptyNewsChartStats();
  }
}

export async function getHomePageNewsCountryChartStats(
  searchQuery: string
): Promise<HomePageNewsCountryChartStats> {
  try {
    return await getCachedHomePageNewsCountryChartStats(searchQuery);
  } catch (error) {
    console.error(formatLogMessage("Failed to load news country chart stats from Manticore."), error);

    return getEmptyNewsCountryChartStats();
  }
}

export async function getHomePageReportTrendStats(
  userId: string,
  reportItems: HomePageReportTrendInput[]
): Promise<HomePageReportTrendStats[]> {
  if (!userId.trim() || reportItems.length === 0) {
    return reportItems.map((report) => getEmptyReportTrendStats(report.reportId));
  }

  try {
    return await getCachedHomePageReportTrendStats(
      userId,
      reportItems,
      getReportTrendCacheSignature(reportItems)
    );
  } catch (error) {
    console.error(formatLogMessage("Failed to load report trend stats from Manticore."), error);

    return reportItems.map((report) => getEmptyReportTrendStats(report.reportId));
  }
}

export type { HomePageNewsCountryChartSlice, HomePageNewsCountryChartStats };
export { UNKNOWN_NEWS_COUNTRY, UNKNOWN_NEWS_TYPE };
