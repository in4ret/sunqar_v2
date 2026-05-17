import "server-only";

import { unstable_cache } from "next/cache";

import { manticoreSql } from "@/lib/manticore";

type CountRow = {
  total: number | string;
};

type AverageRow = {
  average: number | string | null;
};

export type HomePageCountStats = {
  total: number;
  today: number;
};

const ALMATY_TIME_ZONE = "Asia/Almaty";
const HOME_STATS_TTL = 60 * 60;

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

async function getNewsStats(searchQuery: string): Promise<HomePageCountStats> {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  try {
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
  } catch (error) {
    console.error("Failed to load news stats from Manticore.", error);

    return {
      total: 0,
      today: 0,
    };
  }
}

async function getSourcesStats(searchQuery: string): Promise<HomePageCountStats> {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  try {
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
  } catch (error) {
    console.error("Failed to load source stats from Manticore.", error);

    return {
      total: 0,
      today: 0,
    };
  }
}

async function getCommentsStats(searchQuery: string): Promise<HomePageCountStats> {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  try {
    const [totalRow, todayRow] = await Promise.all([
      manticoreSql<CountRow>(
        `SELECT COUNT(*) AS total FROM comments${getWhereClause(searchQuery)}`
      ),
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
  } catch (error) {
    console.error("Failed to load comments stats from Manticore.", error);

    return {
      total: 0,
      today: 0,
    };
  }
}

async function getCommentsToneAverageStats(searchQuery: string): Promise<HomePageCountStats> {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  try {
    const [totalRow, todayRow] = await Promise.all([
      manticoreSql<AverageRow>(
        `SELECT AVG(tone) AS average FROM comments${getWhereClause(searchQuery)}`
      ),
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
  } catch (error) {
    console.error("Failed to load comments tone average stats from Manticore.", error);

    return {
      total: 0,
      today: 0,
    };
  }
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

export async function getHomePageNewsStats(searchQuery: string): Promise<HomePageCountStats> {
  return getCachedHomePageNewsStats(searchQuery);
}

export async function getHomePageSourcesStats(searchQuery: string): Promise<HomePageCountStats> {
  return getCachedHomePageSourcesStats(searchQuery);
}

export async function getHomePageCommentsStats(searchQuery: string): Promise<HomePageCountStats> {
  return getCachedHomePageCommentsStats(searchQuery);
}

export async function getHomePageCommentsToneAverageStats(
  searchQuery: string
): Promise<HomePageCountStats> {
  return getCachedHomePageCommentsToneAverageStats(searchQuery);
}
