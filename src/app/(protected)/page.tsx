import { Suspense } from "react";

import {
  getHomePageCommentsDailyStats,
  getHomePageCommentsStats,
  getHomePageCommentsToneAverageStats,
  getHomePageNewsStats,
  getHomePageSourcesStats,
  type HomePageCountStats,
} from "@/lib/home-page-stats";
import { formatCompactNumber, normalizeSearchQueryParam } from "@/lib/utils";
import { StatsValueSkeleton } from "@/ui";

import { HomePageView } from "./home-page-view/home-page-view";

type HomePageSearchParams = Promise<{
  q?: string | string[];
}>;

function formatStatsValue(total: number, today: number) {
  return `${formatCompactNumber(total)} | ${formatCompactNumber(today)}`;
}

function StatsValueFallback() {
  return <StatsValueSkeleton />;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: HomePageSearchParams;
}) {
  const { q } = await searchParams;
  const searchQuery = normalizeSearchQueryParam(q);
  const newsStatsPromise = getHomePageNewsStats(searchQuery);
  const sourcesStatsPromise = getHomePageSourcesStats(searchQuery);
  const commentsStatsPromise = getHomePageCommentsStats(searchQuery);
  const commentsToneAverageStatsPromise = getHomePageCommentsToneAverageStats(searchQuery);
  const commentsDailyStatsPromise = getHomePageCommentsDailyStats(searchQuery);

  return (
    <HomePageView
      commentsChartPromise={commentsDailyStatsPromise}
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
      searchQuery={searchQuery}
      sourcesValue={
        <Suspense fallback={<StatsValueFallback />}>
          <StatsValueFromPromise promise={sourcesStatsPromise} />
        </Suspense>
      }
    />
  );
}

async function StatsValueFromPromise({ promise }: { promise: Promise<HomePageCountStats> }) {
  const stats = await promise;

  return formatStatsValue(stats.total, stats.today);
}
