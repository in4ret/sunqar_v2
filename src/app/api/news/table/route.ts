import { getCurrentUser } from "@/lib/auth/auth";
import { listNewsTableRows, normalizeNewsTablePageSize } from "@/lib/news/news-table";
import {
  DEFAULT_NEWS_TABLE_FILTERS,
  type NewsTableFilters,
  type NewsTableSort,
  type NewsTableSortField,
} from "@/lib/news/news-table.types";
import { normalizeSearchQuery } from "@/lib/utils";

type NewsTableRequestBody = {
  from?: string;
  pageIndex?: number;
  pageSize?: unknown;
  query: string;
  sort?: NewsTableSort;
  sources: string[];
  tableFilters?: Partial<NewsTableFilters>;
  to?: string;
};

const SORT_FIELDS = new Set<NewsTableSortField>(["publishedat", "source", "title"]);

function buildJsonResponse(payload: object, status: number) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function isNewsTableSort(value: unknown): value is NewsTableSort {
  if (value === null || typeof value === "undefined") {
    return true;
  }

  if (typeof value !== "object") {
    return false;
  }

  const sort = value as Partial<NonNullable<NewsTableSort>>;

  return (
    typeof sort.field === "string" &&
    SORT_FIELDS.has(sort.field as NewsTableSortField) &&
    (sort.direction === "asc" || sort.direction === "desc")
  );
}

function isNewsTableFilters(value: unknown): value is Partial<NewsTableFilters> {
  if (typeof value === "undefined") {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const filters = value as Partial<NewsTableFilters>;

  return (
    (typeof filters.publishedFrom === "string" || typeof filters.publishedFrom === "undefined") &&
    (typeof filters.publishedTo === "string" || typeof filters.publishedTo === "undefined") &&
    (typeof filters.source === "string" || typeof filters.source === "undefined") &&
    (typeof filters.title === "string" || typeof filters.title === "undefined")
  );
}

function isNewsTableRequestBody(value: unknown): value is NewsTableRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<NewsTableRequestBody>;

  return (
    typeof body.query === "string" &&
    Array.isArray(body.sources) &&
    body.sources.every((source) => typeof source === "string") &&
    (typeof body.from === "string" || typeof body.from === "undefined") &&
    (typeof body.to === "string" || typeof body.to === "undefined") &&
    (typeof body.pageIndex === "number" || typeof body.pageIndex === "undefined") &&
    isNewsTableSort(body.sort) &&
    isNewsTableFilters(body.tableFilters)
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

  if (!isNewsTableRequestBody(body)) {
    return buildJsonResponse({ error: "Invalid request body." }, 400);
  }

  const result = await listNewsTableRows({
    from: body.from?.trim() ?? "",
    pageIndex: body.pageIndex ?? 0,
    pageSize: normalizeNewsTablePageSize(body.pageSize),
    query: normalizeSearchQuery(body.query),
    sort: body.sort ?? null,
    sources: body.sources,
    tableFilters: {
      ...DEFAULT_NEWS_TABLE_FILTERS,
      ...body.tableFilters,
    },
    to: body.to?.trim() ?? "",
  });

  return buildJsonResponse(result, 200);
}
