import { Suspense } from "react";

import { manticoreSql } from "@/lib/manticore";
import { formatCompactNumber } from "@/lib/utils";
import { StatsValueSkeleton } from "@/ui";

import { HomePageView } from "./home-page-view/home-page-view";

type CountRow = {
  total: number | string;
};

type CountStats = {
  total: number;
  today: number;
};

type AverageRow = {
  average: number | string | null;
};

const ALMATY_TIME_ZONE = "Asia/Almaty";

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

async function getNewsStats() {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  try {
    const [totalRow, todayRow] = await Promise.all([
      manticoreSql<CountRow>("SELECT COUNT(*) AS total FROM news"),
      manticoreSql<CountRow>(
        `SELECT COUNT(*) AS total FROM news WHERE publishedat >= ${startOfToday} AND publishedat < ${startOfNextDay}`
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

async function getSourcesStats(): Promise<CountStats> {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  try {
    const [totalRow, todayRow] = await Promise.all([
      manticoreSql<CountRow>("SELECT COUNT(DISTINCT source) AS total FROM news"),
      manticoreSql<CountRow>(
        `SELECT COUNT(DISTINCT source) AS total FROM news WHERE publishedat >= ${startOfToday} AND publishedat < ${startOfNextDay}`
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

async function getCommentsStats(): Promise<CountStats> {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  try {
    const [totalRow, todayRow] = await Promise.all([
      manticoreSql<CountRow>("SELECT COUNT(*) AS total FROM comments"),
      manticoreSql<CountRow>(
        `SELECT COUNT(*) AS total FROM comments WHERE publishedat >= ${startOfToday} AND publishedat < ${startOfNextDay}`
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

async function getCommentsToneAverageStats(): Promise<CountStats> {
  const startOfToday = getStartOfDayEpochSeconds(new Date(), ALMATY_TIME_ZONE);
  const startOfNextDay = startOfToday + 24 * 60 * 60;

  try {
    const [totalRow, todayRow] = await Promise.all([
      manticoreSql<AverageRow>("SELECT AVG(tone) AS average FROM comments"),
      manticoreSql<AverageRow>(
        `SELECT AVG(tone) AS average FROM comments WHERE publishedat >= ${startOfToday} AND publishedat < ${startOfNextDay}`
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

function formatStatsValue(total: number, today: number) {
  return `${formatCompactNumber(total)} | ${formatCompactNumber(today)}`;
}

function StatsValueFallback() {
  return <StatsValueSkeleton />;
}

export default async function HomePage() {
  const newsStatsPromise = getNewsStats();
  const sourcesStatsPromise = getSourcesStats();
  const commentsStatsPromise = getCommentsStats();
  const commentsToneAverageStatsPromise = getCommentsToneAverageStats();

  return (
    <HomePageView
      commentsToneAverageValue={
        <Suspense fallback={<StatsValueFallback />}>
          <StatsValueFromPromise promise={commentsToneAverageStatsPromise} />
        </Suspense>
      }
      commentsValue={
        <Suspense fallback={<StatsValueFallback />}>
          <StatsValueFromPromise promise={commentsStatsPromise} />
        </Suspense>
      }
      newsValue={
        <Suspense fallback={<StatsValueFallback />}>
          <StatsValueFromPromise promise={newsStatsPromise} />
        </Suspense>
      }
      sourcesValue={
        <Suspense fallback={<StatsValueFallback />}>
          <StatsValueFromPromise promise={sourcesStatsPromise} />
        </Suspense>
      }
    />
  );
}

async function StatsValueFromPromise({ promise }: { promise: Promise<CountStats> }) {
  const stats = await promise;

  return formatStatsValue(stats.total, stats.today);
}
