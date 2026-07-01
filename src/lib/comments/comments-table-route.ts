import { normalizeSearchQuery } from "@/lib/utils";

import {
  type listCommentsTableRows,
  normalizeCommentsTableFilters,
} from "./comments-table";
import {
  type CommentsTableFilters,
  type CommentsTableSort,
  type CommentsTableSortField,
} from "./comments-table.types";
import { normalizeCommentsTablePageSize } from "./comments-table-shared";

type GetCurrentUser = () => Promise<unknown>;

export type CommentsTableRequestBody = {
  from?: string;
  pageIndex?: number;
  pageSize?: unknown;
  posts: string[];
  query: string;
  sort?: CommentsTableSort;
  tableFilters?: Partial<CommentsTableFilters>;
  to?: string;
};

type CommentsTablePostHandlerDependencies = {
  getCurrentUserImpl: GetCurrentUser;
  listCommentsTableRowsImpl: typeof listCommentsTableRows;
};

const SORT_FIELDS = new Set<CommentsTableSortField>([
  "call_to_action",
  "content_id",
  "likes",
  "publishedat",
  "threat",
  "toxic",
  "username",
]);

function buildJsonResponse(payload: object, status: number) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function isCommentsTableSort(value: unknown): value is CommentsTableSort {
  if (value === null || typeof value === "undefined") {
    return true;
  }

  if (typeof value !== "object") {
    return false;
  }

  const sort = value as Partial<NonNullable<CommentsTableSort>>;

  return (
    typeof sort.field === "string" &&
    SORT_FIELDS.has(sort.field as CommentsTableSortField) &&
    (sort.direction === "asc" || sort.direction === "desc")
  );
}

function isCommentsTableFilters(value: unknown): value is Partial<CommentsTableFilters> | undefined {
  if (typeof value === "undefined") {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const filters = value as Partial<CommentsTableFilters>;

  return (
    (typeof filters.callToActionFrom === "string" || typeof filters.callToActionFrom === "undefined") &&
    (typeof filters.callToActionTo === "string" || typeof filters.callToActionTo === "undefined") &&
    (typeof filters.comment === "string" || typeof filters.comment === "undefined") &&
    (typeof filters.likesFrom === "string" || typeof filters.likesFrom === "undefined") &&
    (typeof filters.likesTo === "string" || typeof filters.likesTo === "undefined") &&
    (typeof filters.threatFrom === "string" || typeof filters.threatFrom === "undefined") &&
    (typeof filters.threatTo === "string" || typeof filters.threatTo === "undefined") &&
    (typeof filters.toxicFrom === "string" || typeof filters.toxicFrom === "undefined") &&
    (typeof filters.toxicTo === "string" || typeof filters.toxicTo === "undefined") &&
    (typeof filters.username === "string" || typeof filters.username === "undefined")
  );
}

function normalizeCommentsTableRequestFilters(
  filters: Partial<CommentsTableFilters> | undefined,
): CommentsTableFilters {
  if (!filters) {
    return normalizeCommentsTableFilters({});
  }

  return normalizeCommentsTableFilters({
    callToActionFrom: filters.callToActionFrom?.trim(),
    callToActionTo: filters.callToActionTo?.trim(),
    comment: filters.comment?.trim(),
    likesFrom: filters.likesFrom?.trim(),
    likesTo: filters.likesTo?.trim(),
    threatFrom: filters.threatFrom?.trim(),
    threatTo: filters.threatTo?.trim(),
    toxicFrom: filters.toxicFrom?.trim(),
    toxicTo: filters.toxicTo?.trim(),
    username: filters.username?.trim(),
  });
}

function isCommentsTableRequestBody(value: unknown): value is CommentsTableRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<CommentsTableRequestBody>;

  return (
    typeof body.query === "string" &&
    Array.isArray(body.posts) &&
    (typeof body.from === "string" || typeof body.from === "undefined") &&
    (typeof body.to === "string" || typeof body.to === "undefined") &&
    (typeof body.pageIndex === "number" || typeof body.pageIndex === "undefined") &&
    isCommentsTableSort(body.sort) &&
    isCommentsTableFilters(body.tableFilters)
  );
}

export function createCommentsTablePostHandler({
  getCurrentUserImpl,
  listCommentsTableRowsImpl,
}: CommentsTablePostHandlerDependencies) {
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

    if (!isCommentsTableRequestBody(body) || !body.posts.every((post) => typeof post === "string")) {
      return buildJsonResponse({ error: "Invalid request body." }, 400);
    }

    const result = await listCommentsTableRowsImpl({
      from: body.from?.trim() ?? "",
      pageIndex: body.pageIndex ?? 0,
      pageSize: normalizeCommentsTablePageSize(body.pageSize),
      posts: body.posts,
      query: normalizeSearchQuery(body.query),
      sort: body.sort ?? null,
      tableFilters: normalizeCommentsTableRequestFilters(body.tableFilters),
      to: body.to?.trim() ?? "",
    });

    return buildJsonResponse(result, 200);
  };
}
