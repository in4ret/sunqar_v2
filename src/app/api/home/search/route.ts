import { getCurrentUser } from "@/lib/auth/auth";
import {
  getHomePageCommentsChartStats,
  getHomePageCommentsStats,
  getHomePageCommentsToneAverageStats,
  getHomePageNewsChartStats,
  getHomePageNewsCountryChartStats,
  getHomePageNewsStats,
  getHomePageSourcesStats,
} from "@/lib/home-page-stats";
import { normalizeSearchQuery } from "@/lib/utils";

type HomeSearchRequestBody = {
  query: string;
};

function buildJsonResponse(payload: object, status: number) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function isHomeSearchRequestBody(value: unknown): value is HomeSearchRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<HomeSearchRequestBody>;

  return typeof body.query === "string";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return buildJsonResponse({ error: "Unauthorized." }, 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return buildJsonResponse({ error: "Invalid request body." }, 400);
  }

  if (!isHomeSearchRequestBody(body)) {
    return buildJsonResponse({ error: "Invalid request body." }, 400);
  }

  const searchQuery = normalizeSearchQuery(body.query);
  const [
    commentsChart,
    commentsToneAverageValue,
    commentsValue,
    newsChart,
    newsCountryChart,
    newsValue,
    sourcesValue,
  ] = await Promise.all([
    getHomePageCommentsChartStats(searchQuery),
    getHomePageCommentsToneAverageStats(searchQuery),
    getHomePageCommentsStats(searchQuery),
    getHomePageNewsChartStats(searchQuery),
    getHomePageNewsCountryChartStats(searchQuery),
    getHomePageNewsStats(searchQuery),
    getHomePageSourcesStats(searchQuery),
  ]);

  return buildJsonResponse(
    {
      commentsChart,
      commentsToneAverageValue,
      commentsValue,
      newsChart,
      newsCountryChart,
      newsValue,
      sourcesValue,
    },
    200,
  );
}
