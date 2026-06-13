import "server-only";

import { manticoreSql } from "@/lib/manticore";
import {
  buildNewsWhereClause,
  type NewsQueryInput,
  normalizeNewsEpochSecondsValue,
  normalizeNewsQueryInput,
} from "@/lib/news/news-filters";

import {
  DEFAULT_NEWS_TABLE_FILTERS,
  DEFAULT_NEWS_TABLE_PAGE_SIZE,
  NEWS_TABLE_PAGE_SIZES,
  type NewsTableFilters,
  type NewsTablePageSize,
  type NewsTableQueryInput,
  type NewsTableResult,
  type NewsTableRow,
  type NewsTableSort,
  type NewsTableSortField,
} from "./news-table.types";

type RawNewsTableRow = {
  id?: number | string | null;
  publishedat?: number | string | null;
  source?: number | string | null;
  title?: number | string | null;
  url?: number | string | null;
};

type CountRow = {
  total: number | string;
};

const SORT_FIELDS: Record<NewsTableSortField, string> = {
  publishedat: "publishedat",
  source: "source",
  title: "title",
};

const MAX_MANTICORE_MATCHES = 10000;

function escapeSqlStringValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function escapeRegexValue(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeManticoreMatchValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll('"', '\\"');
}

function buildSourceRegexCondition(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return `REGEX(source, '.*${escapeSqlStringValue(escapeRegexValue(normalizedValue))}.*')`;
}

function buildTableMatchQuery(query: string, titleFilter: string) {
  const normalizedTitleFilter = titleFilter.trim();
  const titleMatchQuery = normalizedTitleFilter
    ? `@title "${escapeManticoreMatchValue(normalizedTitleFilter)}"`
    : "";

  return [query, titleMatchQuery].filter(Boolean).join(" ");
}

function buildTableFilterConditions(filters: NewsTableFilters) {
  const conditions: string[] = [];
  const sourceCondition = buildSourceRegexCondition(filters.source);
  const publishedFrom = normalizeNewsEpochSecondsValue(filters.publishedFrom);
  const publishedTo = normalizeNewsEpochSecondsValue(filters.publishedTo);

  if (sourceCondition) {
    conditions.push(sourceCondition);
  }

  if (publishedFrom !== null) {
    conditions.push(`publishedat >= ${publishedFrom}`);
  }

  if (publishedTo !== null) {
    conditions.push(`publishedat < ${publishedTo + 60}`);
  }

  return conditions;
}

function normalizeTableFilters(filters: Partial<NewsTableFilters> | undefined): NewsTableFilters {
  return {
    publishedFrom: filters?.publishedFrom?.trim() ?? DEFAULT_NEWS_TABLE_FILTERS.publishedFrom,
    publishedTo: filters?.publishedTo?.trim() ?? DEFAULT_NEWS_TABLE_FILTERS.publishedTo,
    source: filters?.source?.trim() ?? DEFAULT_NEWS_TABLE_FILTERS.source,
    title: filters?.title?.trim() ?? DEFAULT_NEWS_TABLE_FILTERS.title,
  };
}

export function normalizeNewsTablePageSize(value: unknown): NewsTablePageSize {
  return NEWS_TABLE_PAGE_SIZES.find((pageSize) => pageSize === value) ?? DEFAULT_NEWS_TABLE_PAGE_SIZE;
}

function normalizePageIndex(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    return 0;
  }

  return value;
}

function normalizeSort(sort: NewsTableSort): NewsTableSort {
  if (!sort || !(sort.field in SORT_FIELDS) || (sort.direction !== "asc" && sort.direction !== "desc")) {
    return null;
  }

  return sort;
}

function buildOrderClause(sort: NewsTableSort) {
  const normalizedSort = normalizeSort(sort);

  if (!normalizedSort) {
    return " ORDER BY publishedat DESC, id DESC";
  }

  return ` ORDER BY ${SORT_FIELDS[normalizedSort.field]} ${normalizedSort.direction.toUpperCase()}, id DESC`;
}

function getFallbackNewsTableRowId(row: RawNewsTableRow, index: number) {
  return [
    row.publishedat === null || typeof row.publishedat === "undefined" ? "" : String(row.publishedat),
    row.source === null || typeof row.source === "undefined" ? "" : String(row.source),
    row.url === null || typeof row.url === "undefined" ? "" : String(row.url),
    row.title === null || typeof row.title === "undefined" ? "" : String(row.title),
    index,
  ].join("\u0000");
}

function normalizeNewsTableRow(row: RawNewsTableRow, index: number): NewsTableRow | null {
  const rawId = row.id;
  const id =
    rawId === null || typeof rawId === "undefined" || String(rawId) === ""
      ? getFallbackNewsTableRowId(row, index)
      : String(rawId);
  const publishedat = Number(row.publishedat ?? 0);

  if (!Number.isFinite(publishedat)) {
    return null;
  }

  return {
    id,
    publishedat,
    source: row.source === null || typeof row.source === "undefined" ? "" : String(row.source),
    title: row.title === null || typeof row.title === "undefined" ? "" : String(row.title),
    url: row.url === null || typeof row.url === "undefined" ? "" : String(row.url),
  };
}

function buildWhereClause(
  normalizedInput: NewsQueryInput,
  tableFilters: NewsTableFilters,
) {
  return buildNewsWhereClause(
    buildTableMatchQuery(normalizedInput.query, tableFilters.title),
    normalizedInput.sources,
    normalizedInput.from,
    normalizedInput.to,
    buildTableFilterConditions(tableFilters),
  );
}

export async function listNewsTableRows(input: NewsTableQueryInput): Promise<NewsTableResult> {
  const normalizedInput = normalizeNewsQueryInput(input);
  const tableFilters = normalizeTableFilters(input.tableFilters);
  const pageSize = normalizeNewsTablePageSize(input.pageSize);
  const pageIndex = normalizePageIndex(input.pageIndex);
  const offset = pageIndex * pageSize;
  const whereClause = buildWhereClause(normalizedInput, tableFilters);
  const orderClause = buildOrderClause(input.sort);
  const [rows, countRows] = await Promise.all([
    manticoreSql<RawNewsTableRow>(
      `SELECT id, title, url, publishedat, source FROM news${whereClause}${orderClause} LIMIT ${offset}, ${pageSize} OPTION max_matches=${MAX_MANTICORE_MATCHES}`,
    ),
    manticoreSql<CountRow>(
      `SELECT COUNT(*) AS total FROM news${whereClause} OPTION max_matches=${MAX_MANTICORE_MATCHES}`,
    ),
  ]);

  return {
    pageIndex,
    pageSize,
    rows: rows
      .map((row, index) => normalizeNewsTableRow(row, offset + index))
      .filter((row): row is NewsTableRow => row !== null),
    total: Number(countRows[0]?.total ?? 0),
  };
}
