import { normalizeSearchQuery } from "@/lib/utils";

import { type countComments } from "./comments-count";

type GetCurrentUser = () => Promise<unknown>;

export type CommentsCountRequestBody = {
  from?: string;
  posts: string[];
  query: string;
  to?: string;
};

type CommentsCountPostHandlerDependencies = {
  countCommentsImpl: typeof countComments;
  getCurrentUserImpl: GetCurrentUser;
};

function buildJsonResponse(payload: object, status: number) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function isCommentsCountRequestBody(value: unknown): value is CommentsCountRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<CommentsCountRequestBody>;

  return (
    typeof body.query === "string" &&
    Array.isArray(body.posts) &&
    (typeof body.from === "string" || typeof body.from === "undefined") &&
    (typeof body.to === "string" || typeof body.to === "undefined")
  );
}

export function createCommentsCountPostHandler({
  countCommentsImpl,
  getCurrentUserImpl,
}: CommentsCountPostHandlerDependencies) {
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

    if (!isCommentsCountRequestBody(body) || !body.posts.every((post) => typeof post === "string")) {
      return buildJsonResponse({ error: "Invalid request body." }, 400);
    }

    const total = await countCommentsImpl({
      from: body.from?.trim() ?? "",
      posts: body.posts,
      query: normalizeSearchQuery(body.query),
      to: body.to?.trim() ?? "",
    });

    return buildJsonResponse({ total }, 200);
  };
}
