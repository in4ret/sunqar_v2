import "server-only";

import { manticoreSql } from "@/lib/manticore";
import { normalizeNewsEpochSecondsValue } from "@/lib/news/news-filters";

import {
  DEFAULT_NEWS_RELATED_TABLE_FILTERS,
  type NewsRelatedTableFilters,
  type NewsRelatedTableQueryInput,
  type NewsRelatedTableResult,
  type NewsRelatedTableRow,
  type NewsRelatedTableSort,
  type NewsRelatedTableSortField,
} from "./news-related-table.types";
import { normalizeNewsTablePageSize } from "./news-table";

type RawNewsRelatedTableRow = {
  id?: number | string | null;
  publishedat?: number | string | null;
  row_id?: number | string | null;
  similarity?: number | string | null;
  source?: number | string | null;
  title?: number | string | null;
  type?: number | string | null;
  url?: number | string | null;
};

type RawNewsEmbeddingRow = {
  embbeding?: unknown;
};

const MAX_RELATED_NEWS_MATCHES = 1000;
const SORT_FIELDS = new Set<NewsRelatedTableSortField>(["publishedat", "similarity", "source", "title", "type"]);

export function normalizeNewsRelatedTableNewsId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return /^\d+$/.test(normalizedValue) && normalizedValue !== "0" ? normalizedValue : null;
}

function normalizePageIndex(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    return 0;
  }

  return value;
}

function normalizeEmbeddingVector(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const vector = value.map((item) => Number(item));

  return vector.length > 0 && vector.every((item) => Number.isFinite(item)) ? vector : null;
}

function buildVectorLiteral(vector: number[]) {
  return `(${vector.join(",")})`;
}

function normalizeTableFilters(filters: Partial<NewsRelatedTableFilters> | undefined): NewsRelatedTableFilters {
  return {
    publishedFrom: filters?.publishedFrom?.trim() ?? DEFAULT_NEWS_RELATED_TABLE_FILTERS.publishedFrom,
    publishedTo: filters?.publishedTo?.trim() ?? DEFAULT_NEWS_RELATED_TABLE_FILTERS.publishedTo,
    similarityFrom: filters?.similarityFrom?.trim() ?? DEFAULT_NEWS_RELATED_TABLE_FILTERS.similarityFrom,
    similarityTo: filters?.similarityTo?.trim() ?? DEFAULT_NEWS_RELATED_TABLE_FILTERS.similarityTo,
    source: filters?.source?.trim() ?? DEFAULT_NEWS_RELATED_TABLE_FILTERS.source,
    title: filters?.title?.trim() ?? DEFAULT_NEWS_RELATED_TABLE_FILTERS.title,
    type: filters?.type?.trim() ?? DEFAULT_NEWS_RELATED_TABLE_FILTERS.type,
  };
}

function normalizeNumberFilter(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const numberValue = Number(trimmedValue);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeSort(sort: NewsRelatedTableSort): NewsRelatedTableSort {
  if (!sort || !SORT_FIELDS.has(sort.field) || (sort.direction !== "asc" && sort.direction !== "desc")) {
    return null;
  }

  return sort;
}

function includesFilter(value: string, filter: string) {
  const normalizedFilter = filter.trim().toLocaleLowerCase();

  return normalizedFilter ? value.toLocaleLowerCase().includes(normalizedFilter) : true;
}

function filterNewsRelatedTableRows(rows: NewsRelatedTableRow[], filters: NewsRelatedTableFilters) {
  const publishedFrom = normalizeNewsEpochSecondsValue(filters.publishedFrom);
  const publishedTo = normalizeNewsEpochSecondsValue(filters.publishedTo);
  const similarityFrom = normalizeNumberFilter(filters.similarityFrom);
  const similarityTo = normalizeNumberFilter(filters.similarityTo);

  return rows.filter((row) => {
    if (!includesFilter(row.type, filters.type)) {
      return false;
    }

    if (!includesFilter(row.source, filters.source)) {
      return false;
    }

    if (!includesFilter(row.title, filters.title)) {
      return false;
    }

    if (publishedFrom !== null && row.publishedat < publishedFrom) {
      return false;
    }

    if (publishedTo !== null && row.publishedat >= publishedTo + 60) {
      return false;
    }

    if (similarityFrom !== null && row.similarity < similarityFrom) {
      return false;
    }

    if (similarityTo !== null && row.similarity > similarityTo) {
      return false;
    }

    return true;
  });
}

function compareTextValues(left: string, right: string) {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function compareRowIds(left: string, right: string) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right);
}

function sortNewsRelatedTableRows(rows: NewsRelatedTableRow[], sort: NewsRelatedTableSort) {
  const normalizedSort = normalizeSort(sort);

  if (!normalizedSort) {
    return rows;
  }

  const directionMultiplier = normalizedSort.direction === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    let result = 0;

    if (normalizedSort.field === "publishedat" || normalizedSort.field === "similarity") {
      result = left[normalizedSort.field] - right[normalizedSort.field];
    } else {
      result = compareTextValues(left[normalizedSort.field], right[normalizedSort.field]);
    }

    if (result === 0) {
      result = compareRowIds(left.id, right.id);
    }

    return result * directionMultiplier;
  });
}

function normalizeNewsRelatedTableRow(row: RawNewsRelatedTableRow): NewsRelatedTableRow | null {
  const rawId = row.row_id ?? row.id;
  const publishedat = Number(row.publishedat ?? 0);
  const similarity = Number(row.similarity ?? 0);

  if (rawId === null || typeof rawId === "undefined" || String(rawId) === "") {
    return null;
  }

  if (!Number.isFinite(publishedat) || !Number.isFinite(similarity)) {
    return null;
  }

  return {
    id: String(rawId),
    publishedat,
    similarity,
    source: row.source === null || typeof row.source === "undefined" ? "" : String(row.source),
    title: row.title === null || typeof row.title === "undefined" ? "" : String(row.title),
    type: row.type === null || typeof row.type === "undefined" ? "" : String(row.type),
    url: row.url === null || typeof row.url === "undefined" ? "" : String(row.url),
  };
}

export async function listNewsRelatedTableRows(
  input: NewsRelatedTableQueryInput,
): Promise<NewsRelatedTableResult> {
  const newsId = normalizeNewsRelatedTableNewsId(input.newsId);

  if (!newsId) {
    throw new Error("Invalid related news id.");
  }

  const pageSize = normalizeNewsTablePageSize(input.pageSize);
  const pageIndex = normalizePageIndex(input.pageIndex);
  const offset = pageIndex * pageSize;
  const tableFilters = normalizeTableFilters(input.tableFilters);
  const embeddingRows = await manticoreSql<RawNewsEmbeddingRow>(
    `SELECT embbeding FROM news WHERE id = ${newsId} LIMIT 1`,
  );
  const embeddingVector = normalizeEmbeddingVector(embeddingRows[0]?.embbeding);

  if (!embeddingVector) {
    return {
      pageIndex,
      pageSize,
      rows: [],
      total: 0,
    };
  }

  const whereClause = `WHERE knn(embbeding,${MAX_RELATED_NEWS_MATCHES},${buildVectorLiteral(embeddingVector)})`;
  const rows = await manticoreSql<RawNewsRelatedTableRow>(
    `SELECT TO_STRING(id) AS row_id, type, publishedat, title, source, url, knn_dist() AS similarity FROM news ${whereClause} LIMIT 0, ${MAX_RELATED_NEWS_MATCHES} OPTION max_matches=${MAX_RELATED_NEWS_MATCHES}`,
  );
  const filteredRows = filterNewsRelatedTableRows(
    rows.map(normalizeNewsRelatedTableRow).filter((row): row is NewsRelatedTableRow => row !== null),
    tableFilters,
  );
  const sortedRows = sortNewsRelatedTableRows(filteredRows, input.sort);

  return {
    pageIndex,
    pageSize,
    rows: sortedRows.slice(offset, offset + pageSize),
    total: sortedRows.length,
  };
}
