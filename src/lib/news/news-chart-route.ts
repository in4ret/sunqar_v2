import { normalizeSearchQuery } from "@/lib/utils";

import { type getNewsChart } from "./news-chart";
import type { NewsChartAggregation } from "./news-chart-shared";

type GetCurrentUser = () => Promise<unknown>;

export type NewsChartRequestBody = {
  aggregation: NewsChartAggregation;
  from?: string;
  query: string;
  sources: string[];
  to?: string;
};

type NewsChartPostHandlerDependencies = {
  getCurrentUserImpl: GetCurrentUser;
  getNewsChartImpl: typeof getNewsChart;
};

function buildJsonResponse(payload: object, status: number) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function isNewsChartAggregation(value: unknown): value is NewsChartAggregation {
  return value === "sources" || value === "countries";
}

function isNewsChartRequestBody(value: unknown): value is NewsChartRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<NewsChartRequestBody>;

  return (
    isNewsChartAggregation(body.aggregation) &&
    typeof body.query === "string" &&
    Array.isArray(body.sources) &&
    (typeof body.from === "string" || typeof body.from === "undefined") &&
    (typeof body.to === "string" || typeof body.to === "undefined")
  );
}

export function createNewsChartPostHandler({
  getCurrentUserImpl,
  getNewsChartImpl,
}: NewsChartPostHandlerDependencies) {
  return async function POST(request: Request) {
    const user = await getCurrentUserImpl();

    if (!user) {
      return buildJsonResponse({ error: "Unauthorized." }, 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return buildJsonResponse({ error: "Invalid request body." }, 400);
    }

    if (!isNewsChartRequestBody(body) || !body.sources.every((source) => typeof source === "string")) {
      return buildJsonResponse({ error: "Invalid request body." }, 400);
    }

    const result = await getNewsChartImpl({
      aggregation: body.aggregation,
      from: body.from?.trim() ?? "",
      query: normalizeSearchQuery(body.query),
      sources: body.sources,
      to: body.to?.trim() ?? "",
    });

    return buildJsonResponse(result, 200);
  };
}
