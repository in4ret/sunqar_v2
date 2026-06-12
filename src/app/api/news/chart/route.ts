import { getCurrentUser } from "@/lib/auth/auth";
import { getNewsChart } from "@/lib/news/news-chart";
import { normalizeSearchQuery } from "@/lib/utils";

type NewsChartRequestBody = {
  from?: string;
  query: string;
  sources: string[];
  to?: string;
};

function buildJsonResponse(payload: object, status: number) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function isNewsChartRequestBody(value: unknown): value is NewsChartRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<NewsChartRequestBody>;

  return (
    typeof body.query === "string" &&
    Array.isArray(body.sources) &&
    (typeof body.from === "string" || typeof body.from === "undefined") &&
    (typeof body.to === "string" || typeof body.to === "undefined")
  );
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

  if (!isNewsChartRequestBody(body) || !body.sources.every((source) => typeof source === "string")) {
    return buildJsonResponse({ error: "Invalid request body." }, 400);
  }

  const stats = await getNewsChart({
    from: body.from?.trim() ?? "",
    query: normalizeSearchQuery(body.query),
    sources: body.sources,
    to: body.to?.trim() ?? "",
  });

  return buildJsonResponse(stats, 200);
}
