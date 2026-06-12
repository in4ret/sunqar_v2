import { getCurrentUser } from "@/lib/auth/auth";
import { countNews } from "@/lib/news/news-count";
import { normalizeSearchQuery } from "@/lib/utils";

type NewsCountRequestBody = {
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

function isNewsCountRequestBody(value: unknown): value is NewsCountRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<NewsCountRequestBody>;

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

  if (!isNewsCountRequestBody(body) || !body.sources.every((source) => typeof source === "string")) {
    return buildJsonResponse({ error: "Invalid request body." }, 400);
  }

  const total = await countNews({
    from: body.from?.trim() ?? "",
    query: normalizeSearchQuery(body.query),
    sources: body.sources,
    to: body.to?.trim() ?? "",
  });

  return buildJsonResponse({ total }, 200);
}
