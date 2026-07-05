import "server-only";

import { manticoreSql } from "@/lib/manticore";
import { normalizeSearchQuery } from "@/lib/utils";

import {
  type CommentsRelatedTableFilters,
  type CommentsRelatedTableQueryInput,
  type CommentsRelatedTableResult,
  type CommentsRelatedTableRow,
  type CommentsRelatedTableSort,
  type CommentsRelatedTableSortField,
  DEFAULT_COMMENTS_RELATED_TABLE_FILTERS,
} from "./comments-related-table.types";
import { normalizeCommentsTablePageSize, normalizeCommentsTableRow } from "./comments-table-shared";

type RawCommentsRelatedTableRow = Parameters<typeof normalizeCommentsTableRow>[0] & {
  similarity?: number | string | null;
};

type RawCommentsEmbeddingRow = {
  embbeding?: unknown;
};

type ManticoreSql = typeof manticoreSql;

const MAX_RELATED_COMMENTS_MATCHES = 1000;
const SORT_FIELDS = new Set<CommentsRelatedTableSortField>([
  "content_id",
  "likes",
  "publishedat",
  "similarity",
  "username",
]);

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

function normalizeNumberFilter(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const numberValue = Number(trimmedValue);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function includesFilter(value: string, filter: string) {
  const normalizedFilter = normalizeSearchQuery(filter);

  return normalizedFilter ? value.toLocaleLowerCase().includes(normalizedFilter.toLocaleLowerCase()) : true;
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

function normalizeCommentsRelatedTableSort(sort: CommentsRelatedTableSort): CommentsRelatedTableSort {
  if (!sort || !SORT_FIELDS.has(sort.field) || (sort.direction !== "asc" && sort.direction !== "desc")) {
    return null;
  }

  return sort;
}

function filterCommentsRelatedTableRows(
  rows: CommentsRelatedTableRow[],
  filters: CommentsRelatedTableFilters,
) {
  const likesFrom = normalizeNumberFilter(filters.likesFrom);
  const likesTo = normalizeNumberFilter(filters.likesTo);
  const similarityFrom = normalizeNumberFilter(filters.similarityFrom);
  const similarityTo = normalizeNumberFilter(filters.similarityTo);

  return rows.filter((row) => {
    if (!includesFilter(row.comment, filters.comment)) {
      return false;
    }

    if (!includesFilter(row.username, filters.username)) {
      return false;
    }

    if (likesFrom !== null && row.likes < likesFrom) {
      return false;
    }

    if (likesTo !== null && row.likes > likesTo) {
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

function sortCommentsRelatedTableRows(rows: CommentsRelatedTableRow[], sort: CommentsRelatedTableSort) {
  const normalizedSort = normalizeCommentsRelatedTableSort(sort);

  if (!normalizedSort) {
    return [...rows].sort((left, right) => {
      const similarityDiff = left.similarity - right.similarity;

      return similarityDiff === 0 ? compareRowIds(left.id, right.id) : similarityDiff;
    });
  }

  const directionMultiplier = normalizedSort.direction === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    let result = 0;

    if (
      normalizedSort.field === "likes" ||
      normalizedSort.field === "publishedat" ||
      normalizedSort.field === "similarity"
    ) {
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

function normalizeCommentsRelatedTableRow(row: RawCommentsRelatedTableRow): CommentsRelatedTableRow | null {
  const baseRow = normalizeCommentsTableRow(row);
  const similarity = Number(row.similarity ?? 0);

  if (!baseRow || !Number.isFinite(similarity)) {
    return null;
  }

  return {
    ...baseRow,
    similarity,
  };
}

export function normalizeCommentsRelatedTableCommentId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return /^\d+$/.test(normalizedValue) && normalizedValue !== "0" ? normalizedValue : null;
}

export function normalizeCommentsRelatedTableFilters(
  filters: Partial<CommentsRelatedTableFilters> | undefined,
): CommentsRelatedTableFilters {
  return {
    comment: filters?.comment?.trim() ?? DEFAULT_COMMENTS_RELATED_TABLE_FILTERS.comment,
    likesFrom: filters?.likesFrom?.trim() ?? DEFAULT_COMMENTS_RELATED_TABLE_FILTERS.likesFrom,
    likesTo: filters?.likesTo?.trim() ?? DEFAULT_COMMENTS_RELATED_TABLE_FILTERS.likesTo,
    similarityFrom:
      filters?.similarityFrom?.trim() ?? DEFAULT_COMMENTS_RELATED_TABLE_FILTERS.similarityFrom,
    similarityTo: filters?.similarityTo?.trim() ?? DEFAULT_COMMENTS_RELATED_TABLE_FILTERS.similarityTo,
    username: filters?.username?.trim() ?? DEFAULT_COMMENTS_RELATED_TABLE_FILTERS.username,
  };
}

export function createListCommentsRelatedTableRows({ manticoreSqlImpl }: { manticoreSqlImpl: ManticoreSql }) {
  return async function listCommentsRelatedTableRows(
    input: CommentsRelatedTableQueryInput,
  ): Promise<CommentsRelatedTableResult> {
    const commentId = normalizeCommentsRelatedTableCommentId(input.commentId);

    if (!commentId) {
      throw new Error("Invalid related comment id.");
    }

    const pageSize = normalizeCommentsTablePageSize(input.pageSize);
    const pageIndex = normalizePageIndex(input.pageIndex);
    const offset = pageIndex * pageSize;
    const tableFilters = normalizeCommentsRelatedTableFilters(input.tableFilters);
    const embeddingRows = await manticoreSqlImpl<RawCommentsEmbeddingRow>(
      `SELECT embbeding FROM comments WHERE id = ${commentId} LIMIT 1`,
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

    const whereClause =
      `WHERE knn(embbeding,${MAX_RELATED_COMMENTS_MATCHES},${buildVectorLiteral(embeddingVector)})`;
    const rows = await manticoreSqlImpl<RawCommentsRelatedTableRow>(
      `SELECT TO_STRING(id) AS row_id, source, content_id, comment_id, comment, username, publishedat, likes, toxic, threat, call_to_action, knn_dist() AS similarity FROM comments ${whereClause} LIMIT 0, ${MAX_RELATED_COMMENTS_MATCHES} OPTION max_matches=${MAX_RELATED_COMMENTS_MATCHES}`,
    );
    const filteredRows = filterCommentsRelatedTableRows(
      rows
        .map((row) => normalizeCommentsRelatedTableRow(row))
        .filter((row): row is CommentsRelatedTableRow => row !== null),
      tableFilters,
    );
    const sortedRows = sortCommentsRelatedTableRows(filteredRows, input.sort);

    return {
      pageIndex,
      pageSize,
      rows: sortedRows.slice(offset, offset + pageSize),
      total: sortedRows.length,
    };
  };
}

export const listCommentsRelatedTableRows = createListCommentsRelatedTableRows({
  manticoreSqlImpl: manticoreSql,
});
