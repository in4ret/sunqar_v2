import {
  COMMENTS_TABLE_PAGE_SIZES,
  type CommentsTablePageSize,
  type CommentsTableRow,
  type CommentsTableSort,
  type CommentsTableSortField,
  DEFAULT_COMMENTS_TABLE_PAGE_SIZE,
} from "./comments-table.types";

type RawCommentsTableRow = {
  call_to_action?: number | string | null;
  comment?: number | string | null;
  comment_id?: number | string | null;
  content_id?: number | string | null;
  id?: number | string | null;
  likes?: number | string | null;
  publishedat?: number | string | null;
  row_id?: number | string | null;
  source?: number | string | null;
  threat?: number | string | null;
  toxic?: number | string | null;
  username?: number | string | null;
};

const SORT_FIELDS: Record<CommentsTableSortField, string> = {
  call_to_action: "call_to_action",
  content_id: "content_id",
  likes: "likes",
  publishedat: "publishedat",
  threat: "threat",
  toxic: "toxic",
  username: "username",
};

function normalizeNumberValue(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

export function normalizeCommentsTablePageSize(value: unknown): CommentsTablePageSize {
  return (
    COMMENTS_TABLE_PAGE_SIZES.find((pageSize) => pageSize === value) ??
    DEFAULT_COMMENTS_TABLE_PAGE_SIZE
  );
}

export function normalizeCommentsTableSort(sort: CommentsTableSort): CommentsTableSort {
  if (!sort || !(sort.field in SORT_FIELDS) || (sort.direction !== "asc" && sort.direction !== "desc")) {
    return null;
  }

  return sort;
}

export function buildCommentsTableOrderClause(sort: CommentsTableSort) {
  const normalizedSort = normalizeCommentsTableSort(sort);

  if (!normalizedSort) {
    return " ORDER BY publishedat DESC, id DESC";
  }

  return ` ORDER BY ${SORT_FIELDS[normalizedSort.field]} ${normalizedSort.direction.toUpperCase()}, id DESC`;
}

export function normalizeCommentsTableRow(row: RawCommentsTableRow): CommentsTableRow | null {
  const rawId = row.row_id ?? row.id;
  const publishedat = normalizeNumberValue(row.publishedat);
  const likes = normalizeNumberValue(row.likes);
  const toxic = normalizeNumberValue(row.toxic);
  const threat = normalizeNumberValue(row.threat);
  const callToAction = normalizeNumberValue(row.call_to_action);

  if (rawId === null || typeof rawId === "undefined" || String(rawId) === "") {
    return null;
  }

  if (
    publishedat === null ||
    likes === null ||
    toxic === null ||
    threat === null ||
    callToAction === null
  ) {
    return null;
  }

  return {
    call_to_action: callToAction,
    comment: row.comment === null || typeof row.comment === "undefined" ? "" : String(row.comment),
    comment_id:
      row.comment_id === null || typeof row.comment_id === "undefined" ? "" : String(row.comment_id),
    content_id:
      row.content_id === null || typeof row.content_id === "undefined" ? "" : String(row.content_id),
    id: String(rawId),
    likes,
    publishedat,
    source: row.source === null || typeof row.source === "undefined" ? "" : String(row.source),
    threat,
    toxic,
    username: row.username === null || typeof row.username === "undefined" ? "" : String(row.username),
  };
}
