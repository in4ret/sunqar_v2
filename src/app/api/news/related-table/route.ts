import { getCurrentUser } from "@/lib/auth/auth";
import {
  listNewsRelatedTableRows,
  normalizeNewsRelatedTableNewsId,
} from "@/lib/news/news-related-table";
import {
  DEFAULT_NEWS_RELATED_TABLE_FILTERS,
  type NewsRelatedTableFilters,
  type NewsRelatedTableSort,
  type NewsRelatedTableSortField,
} from "@/lib/news/news-related-table.types";
import { normalizeNewsTablePageSize } from "@/lib/news/news-table";
import { NEWS_TABLE_PAGE_SIZES } from "@/lib/news/news-table.types";

type NewsRelatedTableRequestBody = {
  newsId?: unknown;
  pageIndex?: number;
  pageSize?: unknown;
  sort?: NewsRelatedTableSort;
  tableFilters?: Partial<NewsRelatedTableFilters>;
};

const SORT_FIELDS = new Set<NewsRelatedTableSortField>(["publishedat", "similarity", "source", "title", "type"]);

function buildJsonResponse(payload: object, status: number) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function isNewsRelatedTableRequestBody(value: unknown): value is NewsRelatedTableRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<NewsRelatedTableRequestBody>;

  return (
    normalizeNewsRelatedTableNewsId(body.newsId) !== null &&
    (typeof body.pageIndex === "number" || typeof body.pageIndex === "undefined") &&
    (typeof body.pageSize === "undefined" || NEWS_TABLE_PAGE_SIZES.some((pageSize) => pageSize === body.pageSize)) &&
    isNewsRelatedTableSort(body.sort) &&
    isNewsRelatedTableFilters(body.tableFilters)
  );
}

function isNewsRelatedTableSort(value: unknown): value is NewsRelatedTableSort {
  if (value === null || typeof value === "undefined") {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const sort = value as Partial<NonNullable<NewsRelatedTableSort>>;

  return (
    typeof sort.field === "string" &&
    SORT_FIELDS.has(sort.field as NewsRelatedTableSortField) &&
    (sort.direction === "asc" || sort.direction === "desc")
  );
}

function isNewsRelatedTableFilters(value: unknown): value is Partial<NewsRelatedTableFilters> {
  if (typeof value === "undefined") {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const filters = value as Partial<NewsRelatedTableFilters>;

  return (
    (typeof filters.publishedFrom === "string" || typeof filters.publishedFrom === "undefined") &&
    (typeof filters.publishedTo === "string" || typeof filters.publishedTo === "undefined") &&
    (typeof filters.similarityFrom === "string" || typeof filters.similarityFrom === "undefined") &&
    (typeof filters.similarityTo === "string" || typeof filters.similarityTo === "undefined") &&
    (typeof filters.source === "string" || typeof filters.source === "undefined") &&
    (typeof filters.title === "string" || typeof filters.title === "undefined") &&
    (typeof filters.type === "string" || typeof filters.type === "undefined")
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

  if (!isNewsRelatedTableRequestBody(body)) {
    return buildJsonResponse({ error: "Invalid request body." }, 400);
  }

  const newsId = normalizeNewsRelatedTableNewsId(body.newsId);

  if (!newsId) {
    return buildJsonResponse({ error: "Invalid request body." }, 400);
  }

  const result = await listNewsRelatedTableRows({
    newsId,
    pageIndex: body.pageIndex ?? 0,
    pageSize: normalizeNewsTablePageSize(body.pageSize),
    sort: body.sort ?? null,
    tableFilters: {
      ...DEFAULT_NEWS_RELATED_TABLE_FILTERS,
      ...body.tableFilters,
    },
  });

  return buildJsonResponse(result, 200);
}
