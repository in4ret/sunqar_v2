import { getCurrentUser } from "@/lib/auth/auth";
import { listCommentsChartPoints } from "@/lib/comments/comments-chart";
import { createCommentsChartPostHandler } from "@/lib/comments/comments-chart-route";

export const POST = createCommentsChartPostHandler({
  getCurrentUserImpl: getCurrentUser,
  listCommentsChartPointsImpl: listCommentsChartPoints,
});
