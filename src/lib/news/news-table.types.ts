export type NewsTableSortField = "publishedat" | "source" | "title";

export type NewsTableSortDirection = "asc" | "desc";

export type NewsTableSort = {
  direction: NewsTableSortDirection;
  field: NewsTableSortField;
} | null;

export type NewsTableFilters = {
  publishedFrom: string;
  publishedTo: string;
  source: string;
  title: string;
};

export type NewsTablePageSize = 10 | 50 | 100;

export type NewsTableQueryInput = {
  from: string;
  pageIndex: number;
  pageSize: NewsTablePageSize;
  query: string;
  sort: NewsTableSort;
  sources: string[];
  tableFilters: NewsTableFilters;
  to: string;
};

export type NewsTableRow = {
  id: string;
  publishedat: number;
  source: string;
  title: string;
  url: string;
};

export type NewsTableResult = {
  pageIndex: number;
  pageSize: NewsTablePageSize;
  rows: NewsTableRow[];
  total: number;
};

export const DEFAULT_NEWS_TABLE_FILTERS: NewsTableFilters = {
  publishedFrom: "",
  publishedTo: "",
  source: "",
  title: "",
};

export const DEFAULT_NEWS_TABLE_PAGE_SIZE: NewsTablePageSize = 10;

export const NEWS_TABLE_PAGE_SIZES = [10, 50, 100] as const;
