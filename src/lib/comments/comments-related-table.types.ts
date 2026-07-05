import { type CommentsTablePageSize, type CommentsTableRow } from "./comments-table.types";

export type CommentsRelatedTableSortField =
  | "content_id"
  | "likes"
  | "publishedat"
  | "similarity"
  | "username";

export type CommentsRelatedTableSortDirection = "asc" | "desc";

export type CommentsRelatedTableSort = {
  direction: CommentsRelatedTableSortDirection;
  field: CommentsRelatedTableSortField;
} | null;

export type CommentsRelatedTableFilters = {
  comment: string;
  likesFrom: string;
  likesTo: string;
  similarityFrom: string;
  similarityTo: string;
  username: string;
};

export type CommentsRelatedTableQueryInput = {
  commentId: string;
  pageIndex: number;
  pageSize: CommentsTablePageSize;
  sort: CommentsRelatedTableSort;
  tableFilters: CommentsRelatedTableFilters;
};

export type CommentsRelatedTableRow = CommentsTableRow & {
  similarity: number;
};

export type CommentsRelatedTableResult = {
  pageIndex: number;
  pageSize: CommentsTablePageSize;
  rows: CommentsRelatedTableRow[];
  total: number;
};

export const DEFAULT_COMMENTS_RELATED_TABLE_FILTERS: CommentsRelatedTableFilters = {
  comment: "",
  likesFrom: "",
  likesTo: "",
  similarityFrom: "",
  similarityTo: "",
  username: "",
};
