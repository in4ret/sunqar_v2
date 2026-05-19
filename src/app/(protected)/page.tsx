import { Suspense } from "react";

import {
  CommentsBarChart,
  CommentsBarChartSkeleton,
  NewsBarChart,
  NewsBarChartSkeleton,
} from "@/components/home";
import {
  getHomePageCommentsChartStats,
  getHomePageCommentsStats,
  getHomePageCommentsToneAverageStats,
  getHomePageNewsChartStats,
  getHomePageNewsStats,
  getHomePageSourcesStats,
  type HomePageCommentsChartStats,
  type HomePageCountStats,
  type HomePageNewsChartStats,
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
  const newsChartStatsPromise = getHomePageNewsChartStats(searchQuery);
  const sourcesStatsPromise = getHomePageSourcesStats(searchQuery);
  const commentsStatsPromise = getHomePageCommentsStats(searchQuery);
  const commentsToneAverageStatsPromise = getHomePageCommentsToneAverageStats(searchQuery);
  const commentsChartStatsPromise = getHomePageCommentsChartStats(searchQuery);

  return (
    <HomePageView
      commentsChart={
        <Suspense fallback={<CommentsBarChartSkeleton />}>
          <CommentsChartFromPromise promise={commentsChartStatsPromise} />
        </Suspense>
      }
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
      newsChart={
        <Suspense fallback={<NewsBarChartSkeleton />}>
          <NewsChartFromPromise promise={newsChartStatsPromise} />
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

async function CommentsChartFromPromise({
  promise,
}: {
  promise: Promise<HomePageCommentsChartStats>;
}) {
  const stats = await promise;

  return <CommentsBarChart data={stats} />;
}

async function NewsChartFromPromise({
  promise,
}: {
  promise: Promise<HomePageNewsChartStats>;
}) {
  const stats = await promise;

  return <NewsBarChart data={stats} />;
}
