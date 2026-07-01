import "server-only";

import { manticoreSql } from "@/lib/manticore";
import { normalizeSearchQuery } from "@/lib/utils";

import {
  buildCommentsWhereClause,
  type CommentsQueryInput,
  normalizeCommentsQueryInput,
} from "./comments-filters";
import {
  type CommentsTableFilters,
  type CommentsTableQueryInput,
  type CommentsTableResult,
  type CommentsTableRow,
  DEFAULT_COMMENTS_TABLE_FILTERS,
} from "./comments-table.types";
import {
  buildCommentsTableOrderClause,
  normalizeCommentsTablePageSize,
  normalizeCommentsTableRow,
} from "./comments-table-shared";

type CountRow = {
  total: number | string;
};

type RawCommentsTableRow = Parameters<typeof normalizeCommentsTableRow>[0];

const MAX_MANTICORE_MATCHES = 10000;

function normalizePageIndex(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    return 0;
  }

  return value;
}

function escapeManticoreMatchValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll('"', '\\"');
}

function normalizeNumberFilterValue(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const numericValue = Number(trimmedValue);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue;
}

function normalizeNumberRange(from: string, to: string) {
  const fromValue = normalizeNumberFilterValue(from);
  const toValue = normalizeNumberFilterValue(to);

  if (fromValue !== null && toValue !== null && fromValue > toValue) {
    return {
      fromValue: null,
      toValue: null,
    };
  }

  return {
    fromValue,
    toValue,
  };
}

function buildCommentMatchQuery(query: string, commentFilter: string, usernameFilter: string) {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedCommentFilter = normalizeSearchQuery(commentFilter);
  const normalizedUsernameFilter = normalizeSearchQuery(usernameFilter);
  const commentMatchQuery = normalizedCommentFilter
    ? `@comment "*${escapeManticoreMatchValue(normalizedCommentFilter)}*"`
    : "";
  const usernameMatchQuery = normalizedUsernameFilter
    ? `@username "*${escapeManticoreMatchValue(normalizedUsernameFilter)}*"`
    : "";

  return [normalizedQuery, commentMatchQuery, usernameMatchQuery].filter(Boolean).join(" ");
}

export function normalizeCommentsTableFilters(
  filters: Partial<CommentsTableFilters> | undefined,
): CommentsTableFilters {
  return {
    callToActionFrom:
      filters?.callToActionFrom?.trim() ?? DEFAULT_COMMENTS_TABLE_FILTERS.callToActionFrom,
    callToActionTo: filters?.callToActionTo?.trim() ?? DEFAULT_COMMENTS_TABLE_FILTERS.callToActionTo,
    comment: filters?.comment?.trim() ?? DEFAULT_COMMENTS_TABLE_FILTERS.comment,
    likesFrom: filters?.likesFrom?.trim() ?? DEFAULT_COMMENTS_TABLE_FILTERS.likesFrom,
    likesTo: filters?.likesTo?.trim() ?? DEFAULT_COMMENTS_TABLE_FILTERS.likesTo,
    threatFrom: filters?.threatFrom?.trim() ?? DEFAULT_COMMENTS_TABLE_FILTERS.threatFrom,
    threatTo: filters?.threatTo?.trim() ?? DEFAULT_COMMENTS_TABLE_FILTERS.threatTo,
    toxicFrom: filters?.toxicFrom?.trim() ?? DEFAULT_COMMENTS_TABLE_FILTERS.toxicFrom,
    toxicTo: filters?.toxicTo?.trim() ?? DEFAULT_COMMENTS_TABLE_FILTERS.toxicTo,
    username: filters?.username?.trim() ?? DEFAULT_COMMENTS_TABLE_FILTERS.username,
  };
}

export function buildCommentsTableFilterConditions(filters: CommentsTableFilters) {
  const conditions: string[] = [];
  const likesRange = normalizeNumberRange(filters.likesFrom, filters.likesTo);
  const toxicRange = normalizeNumberRange(filters.toxicFrom, filters.toxicTo);
  const threatRange = normalizeNumberRange(filters.threatFrom, filters.threatTo);
  const callToActionRange = normalizeNumberRange(filters.callToActionFrom, filters.callToActionTo);

  if (likesRange.fromValue !== null) {
    conditions.push(`likes >= ${likesRange.fromValue}`);
  }

  if (likesRange.toValue !== null) {
    conditions.push(`likes <= ${likesRange.toValue}`);
  }

  if (toxicRange.fromValue !== null) {
    conditions.push(`toxic >= ${toxicRange.fromValue}`);
  }

  if (toxicRange.toValue !== null) {
    conditions.push(`toxic <= ${toxicRange.toValue}`);
  }

  if (threatRange.fromValue !== null) {
    conditions.push(`threat >= ${threatRange.fromValue}`);
  }

  if (threatRange.toValue !== null) {
    conditions.push(`threat <= ${threatRange.toValue}`);
  }

  if (callToActionRange.fromValue !== null) {
    conditions.push(`call_to_action >= ${callToActionRange.fromValue}`);
  }

  if (callToActionRange.toValue !== null) {
    conditions.push(`call_to_action <= ${callToActionRange.toValue}`);
  }

  return conditions;
}

function buildWhereClause(normalizedInput: CommentsQueryInput, tableFilters: CommentsTableFilters) {
  return buildCommentsWhereClause(
    buildCommentMatchQuery(normalizedInput.query, tableFilters.comment, tableFilters.username),
    normalizedInput.posts,
    normalizedInput.from,
    normalizedInput.to,
    buildCommentsTableFilterConditions(tableFilters),
  );
}

export async function listCommentsTableRows(input: CommentsTableQueryInput): Promise<CommentsTableResult> {
  const normalizedInput = normalizeCommentsQueryInput(input);
  const tableFilters = normalizeCommentsTableFilters(input.tableFilters);
  const pageSize = normalizeCommentsTablePageSize(input.pageSize);
  const pageIndex = normalizePageIndex(input.pageIndex);
  const offset = pageIndex * pageSize;
  const whereClause = buildWhereClause(normalizedInput, tableFilters);
  const orderClause = buildCommentsTableOrderClause(input.sort);
  const [rows, countRows] = await Promise.all([
    manticoreSql<RawCommentsTableRow>(
      `SELECT TO_STRING(id) AS row_id, source, content_id, comment_id, comment, username, publishedat, likes, toxic, threat, call_to_action FROM comments${whereClause}${orderClause} LIMIT ${offset}, ${pageSize} OPTION max_matches=${MAX_MANTICORE_MATCHES}`,
    ),
    manticoreSql<CountRow>(
      `SELECT COUNT(*) AS total FROM comments${whereClause} OPTION max_matches=${MAX_MANTICORE_MATCHES}`,
    ),
  ]);

  return {
    pageIndex,
    pageSize,
    rows: rows
      .map((row) => normalizeCommentsTableRow(row))
      .filter((row): row is CommentsTableRow => row !== null),
    total: Number(countRows[0]?.total ?? 0),
  };
}
