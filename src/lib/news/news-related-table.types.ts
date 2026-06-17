import { type NewsTablePageSize } from "./news-table.types";

export type NewsRelatedTableSortField = "publishedat" | "similarity" | "source" | "title" | "type";

export type NewsRelatedTableSortDirection = "asc" | "desc";

export type NewsRelatedTableSort = {
  direction: NewsRelatedTableSortDirection;
  field: NewsRelatedTableSortField;
} | null;

export type NewsRelatedTableFilters = {
  publishedFrom: string;
  publishedTo: string;
  similarityFrom: string;
  similarityTo: string;
  source: string;
  title: string;
  type: string;
};

export type NewsRelatedTableQueryInput = {
  newsId: string;
  pageIndex: number;
  pageSize: NewsTablePageSize;
  sort: NewsRelatedTableSort;
  tableFilters: NewsRelatedTableFilters;
};

export type NewsRelatedTableRow = {
  id: string;
  publishedat: number;
  similarity: number;
  source: string;
  title: string;
  type: string;
  url: string;
};

export type NewsRelatedTableResult = {
  pageIndex: number;
  pageSize: NewsTablePageSize;
  rows: NewsRelatedTableRow[];
  total: number;
};

export const DEFAULT_NEWS_RELATED_TABLE_FILTERS: NewsRelatedTableFilters = {
  publishedFrom: "",
  publishedTo: "",
  similarityFrom: "",
  similarityTo: "",
  source: "",
  title: "",
  type: "",
};
