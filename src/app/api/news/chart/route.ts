import { getCurrentUser } from "@/lib/auth/auth";
import { getNewsChart } from "@/lib/news/news-chart";
import { createNewsChartPostHandler } from "@/lib/news/news-chart-route";

export const POST = createNewsChartPostHandler({
  getCurrentUserImpl: getCurrentUser,
  getNewsChartImpl: getNewsChart,
});
