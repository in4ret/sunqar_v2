import { normalizeSearchQuery } from "@/lib/utils";

import { type listCommentsChartPoints } from "./comments-chart";

type GetCurrentUser = () => Promise<unknown>;

export type CommentsChartRequestBody = {
  from?: string;
  posts: string[];
  query: string;
  to?: string;
};

type CommentsChartPostHandlerDependencies = {
  getCurrentUserImpl: GetCurrentUser;
  listCommentsChartPointsImpl: typeof listCommentsChartPoints;
};

function buildJsonResponse(payload: object, status: number) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function isCommentsChartRequestBody(value: unknown): value is CommentsChartRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<CommentsChartRequestBody>;

  return (
    typeof body.query === "string" &&
    Array.isArray(body.posts) &&
    (typeof body.from === "string" || typeof body.from === "undefined") &&
    (typeof body.to === "string" || typeof body.to === "undefined")
  );
}

export function createCommentsChartPostHandler({
  getCurrentUserImpl,
  listCommentsChartPointsImpl,
}: CommentsChartPostHandlerDependencies) {
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

    if (!isCommentsChartRequestBody(body) || !body.posts.every((post) => typeof post === "string")) {
      return buildJsonResponse({ error: "Invalid request body." }, 400);
    }

    const result = await listCommentsChartPointsImpl({
      from: body.from?.trim() ?? "",
      posts: body.posts,
      query: normalizeSearchQuery(body.query),
      to: body.to?.trim() ?? "",
    });

    return buildJsonResponse(result, 200);
  };
}
