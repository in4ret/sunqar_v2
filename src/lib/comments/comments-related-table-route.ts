import type { listCommentsRelatedTableRows } from "./comments-related-table";
import { normalizeCommentsRelatedTableCommentId, normalizeCommentsRelatedTableFilters } from "./comments-related-table";
import {
  type CommentsRelatedTableFilters,
  type CommentsRelatedTableSort,
  type CommentsRelatedTableSortField,
  DEFAULT_COMMENTS_RELATED_TABLE_FILTERS,
} from "./comments-related-table.types";
import { normalizeCommentsTablePageSize } from "./comments-table-shared";

type GetCurrentUser = () => Promise<unknown>;

export type CommentsRelatedTableRequestBody = {
  commentId?: unknown;
  pageIndex?: number;
  pageSize?: unknown;
  sort?: CommentsRelatedTableSort;
  tableFilters?: Partial<CommentsRelatedTableFilters>;
};

type CommentsRelatedTablePostHandlerDependencies = {
  getCurrentUserImpl: GetCurrentUser;
  listCommentsRelatedTableRowsImpl: typeof listCommentsRelatedTableRows;
};

const SORT_FIELDS = new Set<CommentsRelatedTableSortField>([
  "content_id",
  "likes",
  "publishedat",
  "similarity",
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

function isCommentsRelatedTableSort(value: unknown): value is CommentsRelatedTableSort {
  if (value === null || typeof value === "undefined") {
    return true;
  }

  if (typeof value !== "object") {
    return false;
  }

  const sort = value as Partial<NonNullable<CommentsRelatedTableSort>>;

  return (
    typeof sort.field === "string" &&
    SORT_FIELDS.has(sort.field as CommentsRelatedTableSortField) &&
    (sort.direction === "asc" || sort.direction === "desc")
  );
}

function isCommentsRelatedTableFilters(value: unknown): value is Partial<CommentsRelatedTableFilters> | undefined {
  if (typeof value === "undefined") {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const filters = value as Partial<CommentsRelatedTableFilters>;

  return (
    (typeof filters.comment === "string" || typeof filters.comment === "undefined") &&
    (typeof filters.likesFrom === "string" || typeof filters.likesFrom === "undefined") &&
    (typeof filters.likesTo === "string" || typeof filters.likesTo === "undefined") &&
    (typeof filters.similarityFrom === "string" || typeof filters.similarityFrom === "undefined") &&
    (typeof filters.similarityTo === "string" || typeof filters.similarityTo === "undefined") &&
    (typeof filters.username === "string" || typeof filters.username === "undefined")
  );
}

function isCommentsRelatedTableRequestBody(value: unknown): value is CommentsRelatedTableRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<CommentsRelatedTableRequestBody>;

  return (
    normalizeCommentsRelatedTableCommentId(body.commentId) !== null &&
    (typeof body.pageIndex === "number" || typeof body.pageIndex === "undefined") &&
    isCommentsRelatedTableSort(body.sort) &&
    isCommentsRelatedTableFilters(body.tableFilters)
  );
}

export function createCommentsRelatedTablePostHandler({
  getCurrentUserImpl,
  listCommentsRelatedTableRowsImpl,
}: CommentsRelatedTablePostHandlerDependencies) {
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

    if (!isCommentsRelatedTableRequestBody(body)) {
      return buildJsonResponse({ error: "Invalid request body." }, 400);
    }

    const commentId = normalizeCommentsRelatedTableCommentId(body.commentId);

    if (!commentId) {
      return buildJsonResponse({ error: "Invalid request body." }, 400);
    }

    const result = await listCommentsRelatedTableRowsImpl({
      commentId,
      pageIndex: body.pageIndex ?? 0,
      pageSize: normalizeCommentsTablePageSize(body.pageSize),
      sort: body.sort ?? null,
      tableFilters: {
        ...DEFAULT_COMMENTS_RELATED_TABLE_FILTERS,
        ...normalizeCommentsRelatedTableFilters(body.tableFilters),
      },
    });

    return buildJsonResponse(result, 200);
  };
}
