export type CommentsTableSortField =
  | "call_to_action"
  | "content_id"
  | "likes"
  | "publishedat"
  | "threat"
  | "toxic"
  | "username";

export type CommentsTableSortDirection = "asc" | "desc";

export type CommentsTableSort = {
  direction: CommentsTableSortDirection;
  field: CommentsTableSortField;
} | null;

export type CommentsTablePageSize = 10 | 50 | 100;

export type CommentsTableFilters = {
  callToActionFrom: string;
  callToActionTo: string;
  comment: string;
  likesFrom: string;
  likesTo: string;
  threatFrom: string;
  threatTo: string;
  toxicFrom: string;
  toxicTo: string;
  username: string;
};

export type CommentsTableQueryInput = {
  from: string;
  pageIndex: number;
  pageSize: CommentsTablePageSize;
  posts: string[];
  query: string;
  sort: CommentsTableSort;
  tableFilters: CommentsTableFilters;
  to: string;
};

export type CommentsTableRow = {
  call_to_action: number;
  comment: string;
  comment_id: string;
  content_id: string;
  id: string;
  likes: number;
  publishedat: number;
  source: string;
  threat: number;
  toxic: number;
  username: string;
};

export type CommentsTableResult = {
  pageIndex: number;
  pageSize: CommentsTablePageSize;
  rows: CommentsTableRow[];
  total: number;
};

export const DEFAULT_COMMENTS_TABLE_PAGE_SIZE: CommentsTablePageSize = 10;

export const DEFAULT_COMMENTS_TABLE_FILTERS: CommentsTableFilters = {
  callToActionFrom: "",
  callToActionTo: "",
  comment: "",
  likesFrom: "",
  likesTo: "",
  threatFrom: "",
  threatTo: "",
  toxicFrom: "",
  toxicTo: "",
  username: "",
};

export const COMMENTS_TABLE_PAGE_SIZES = [10, 50, 100] as const;
