import { requireRole } from "@/lib/auth/auth";
import {
  getHomePageReportTrendStats,
} from "@/lib/home-page-stats";
import { listReports } from "@/lib/reports";
import { normalizeSearchQueryParam } from "@/lib/utils";

import { HomePageView } from "./home-page-view/home-page-view";

type HomePageSearchParams = Promise<{ q?: string | string[] }>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: HomePageSearchParams;
}) {
  const user = await requireRole(["admin", "user"]);
  const { q } = await searchParams;
  const searchQuery = normalizeSearchQueryParam(q);
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
    />
  );
}
