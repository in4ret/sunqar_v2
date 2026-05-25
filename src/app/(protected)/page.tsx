import { Suspense } from "react";

import {
  CommentsBarChart,
  CommentsBarChartSkeleton,
  NewsBarChart,
  NewsBarChartSkeleton,
  NewsCountryPieChart,
  NewsCountryPieChartSkeleton,
} from "@/components/home";
import { requireRole } from "@/lib/auth/auth";
import {
  getHomePageCommentsChartStats,
  getHomePageCommentsStats,
  getHomePageCommentsToneAverageStats,
  getHomePageNewsChartStats,
  getHomePageNewsCountryChartStats,
  getHomePageNewsStats,
  getHomePageReportTrendStats,
  getHomePageSourcesStats,
  type HomePageCommentsChartStats,
  type HomePageCountStats,
  type HomePageNewsChartStats,
  type HomePageNewsCountryChartStats,
} from "@/lib/home-page-stats";
import { listReports } from "@/lib/reports";
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
  const user = await requireRole(["admin", "user"]);
  const { q } = await searchParams;
  const searchQuery = normalizeSearchQueryParam(q);
  const newsStatsPromise = getHomePageNewsStats(searchQuery);
  const newsChartStatsPromise = getHomePageNewsChartStats(searchQuery);
  const newsCountryChartStatsPromise = getHomePageNewsCountryChartStats(searchQuery);
  const sourcesStatsPromise = getHomePageSourcesStats(searchQuery);
  const commentsStatsPromise = getHomePageCommentsStats(searchQuery);
  const commentsToneAverageStatsPromise = getHomePageCommentsToneAverageStats(searchQuery);
  const commentsChartStatsPromise = getHomePageCommentsChartStats(searchQuery);
  const reportItems = await listReports(user.id);
  const reportTrendItems = await getHomePageReportTrendStats(
    user.id,
    reportItems.map((report) => ({
      blocks: report.blocks,
      reportId: report.id,
    }))
  );
  const reportTrendById = new Map(reportTrendItems.map((report) => [report.reportId, report]));

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
      newsCountryChart={
        <Suspense fallback={<NewsCountryPieChartSkeleton />}>
          <NewsCountryChartFromPromise promise={newsCountryChartStatsPromise} />
        </Suspense>
      }
      reportItems={reportItems.map((report) => {
        const trend = reportTrendById.get(report.id);

        return {
          blockKeywords: report.blockKeywords,
          blockSources: report.blockSources,
          id: report.id,
          ranges: trend?.ranges ?? {
            "all-time-monthly": {
              buckets: [],
              series: [],
            },
            "month-daily": {
              buckets: [],
              series: [],
            },
            "six-months-weekly": {
              buckets: [],
              series: [],
            },
          },
          title: report.title,
        };
      })}
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

async function NewsCountryChartFromPromise({
  promise,
}: {
  promise: Promise<HomePageNewsCountryChartStats>;
}) {
  const stats = await promise;

  return <NewsCountryPieChart data={stats} />;
}
