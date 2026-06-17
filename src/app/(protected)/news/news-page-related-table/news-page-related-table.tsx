"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  DEFAULT_NEWS_RELATED_TABLE_FILTERS,
  type NewsRelatedTableFilters,
  type NewsRelatedTableResult,
  type NewsRelatedTableRow,
  type NewsRelatedTableSort,
  type NewsRelatedTableSortField,
} from "@/lib/news/news-related-table.types";
import {
  DEFAULT_NEWS_TABLE_PAGE_SIZE,
  NEWS_TABLE_PAGE_SIZES,
  type NewsTablePageSize,
} from "@/lib/news/news-table.types";
import { formatDateTimeLocalValueToEpochSeconds } from "@/lib/utils";
import { DataTable, type DataTableColumn, type DataTableSort } from "@/ui";

import styles from "./news-page-related-table.module.scss";

type NewsPageRelatedTableProps = {
  activeNewsId: string;
  onSelectedRowIdsChange?: (rowIds: string[]) => void;
};

type TableState =
  | {
      status: "loading";
    }
  | {
      status: "error";
    }
  | {
      data: NewsRelatedTableResult;
      status: "success";
    };

type PageState = {
  newsId: string;
  pageIndex: number;
};

type SelectionState = {
  newsId: string;
  rowIds: Set<string>;
};

const NEWS_RELATED_TABLE_COLUMN_WIDTHS_STORAGE_KEY = "sunqar-news-related-table-column-widths";
const FILTER_DEBOUNCE_MS = 350;
const SORT_FIELDS = new Set<NewsRelatedTableSortField>(["publishedat", "similarity", "source", "title", "type"]);

function isValidExternalUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isNewsRelatedTableResult(value: unknown): value is NewsRelatedTableResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<NewsRelatedTableResult>;

  return (
    Array.isArray(result.rows) &&
    typeof result.total === "number" &&
    typeof result.pageIndex === "number" &&
    typeof result.pageSize === "number" &&
    result.rows.every(
      (row) =>
        row &&
        typeof row === "object" &&
        typeof (row as Partial<NewsRelatedTableRow>).id === "string" &&
        typeof (row as Partial<NewsRelatedTableRow>).type === "string" &&
        typeof (row as Partial<NewsRelatedTableRow>).title === "string" &&
        typeof (row as Partial<NewsRelatedTableRow>).url === "string" &&
        typeof (row as Partial<NewsRelatedTableRow>).source === "string" &&
        typeof (row as Partial<NewsRelatedTableRow>).publishedat === "number" &&
        typeof (row as Partial<NewsRelatedTableRow>).similarity === "number",
    )
  );
}

function toNewsRelatedTableSort(sort: DataTableSort): NewsRelatedTableSort {
  if (!sort || !SORT_FIELDS.has(sort.field as NewsRelatedTableSortField)) {
    return null;
  }

  return {
    direction: sort.direction,
    field: sort.field as NewsRelatedTableSortField,
  };
}

function toApiFilters(filters: NewsRelatedTableFilters): NewsRelatedTableFilters {
  return {
    publishedFrom: formatDateTimeLocalValueToEpochSeconds(filters.publishedFrom),
    publishedTo: formatDateTimeLocalValueToEpochSeconds(filters.publishedTo),
    similarityFrom: filters.similarityFrom,
    similarityTo: filters.similarityTo,
    source: filters.source,
    title: filters.title,
    type: filters.type,
  };
}

export function NewsPageRelatedTable({ activeNewsId, onSelectedRowIdsChange }: NewsPageRelatedTableProps) {
  const locale = useLocale();
  const t = useTranslations();
  const [state, setState] = useState<TableState>({ status: "loading" });
  const [lastSuccessfulData, setLastSuccessfulData] = useState<NewsRelatedTableResult | null>(null);
  const [filters, setFilters] = useState<NewsRelatedTableFilters>(DEFAULT_NEWS_RELATED_TABLE_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<NewsRelatedTableFilters>(
    DEFAULT_NEWS_RELATED_TABLE_FILTERS,
  );
  const [sort, setSort] = useState<DataTableSort>(null);
  const [pageState, setPageState] = useState<PageState>({
    newsId: activeNewsId,
    pageIndex: 0,
  });
  const [pageSize, setPageSize] = useState<NewsTablePageSize>(DEFAULT_NEWS_TABLE_PAGE_SIZE);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    newsId: activeNewsId,
    rowIds: new Set(),
  });
  const pageIndex = pageState.newsId === activeNewsId ? pageState.pageIndex : 0;
  const selectedRowIds = useMemo(
    () => (selectionState.newsId === activeNewsId ? selectionState.rowIds : new Set<string>()),
    [activeNewsId, selectionState.newsId, selectionState.rowIds],
  );
  const apiFilters = useMemo(() => toApiFilters(debouncedFilters), [debouncedFilters]);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [locale],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedFilters(filters);
    }, FILTER_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [filters]);

  useEffect(() => {
    if (!onSelectedRowIdsChange) {
      return;
    }

    onSelectedRowIdsChange(Array.from(selectedRowIds));
  }, [onSelectedRowIdsChange, selectedRowIds]);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadTable() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/news/related-table", {
          body: JSON.stringify({
            newsId: activeNewsId,
            pageIndex,
            pageSize,
            sort: toNewsRelatedTableSort(sort),
            tableFilters: apiFilters,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as unknown;

        if (!isNewsRelatedTableResult(payload)) {
          throw new Error("Response payload is invalid.");
        }

        setState({
          data: payload,
          status: "success",
        });
        setLastSuccessfulData(payload);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setState({ status: "error" });
      }
    }

    void loadTable();

    return () => {
      abortController.abort();
    };
  }, [activeNewsId, apiFilters, pageIndex, pageSize, sort]);

  const visibleData = state.status === "success" ? state.data : lastSuccessfulData;
  const rows = visibleData?.rows ?? [];
  const total = visibleData?.total ?? 0;
  const resetTableNavigation = useCallback(() => {
    setPageState({
      newsId: activeNewsId,
      pageIndex: 0,
    });
    setSelectionState({
      newsId: activeNewsId,
      rowIds: new Set(),
    });
  }, [activeNewsId]);
  const columns = useMemo<Array<DataTableColumn<NewsRelatedTableRow>>>(
    () => [
      {
        cell: () => null,
        enableResizing: false,
        header: <span className={styles["sr-only"]}>{t("news.related-table.select")}</span>,
        id: "select",
        maxSize: 40,
        minSize: 40,
        size: 40,
        width: "2.5rem",
      },
      {
        cell: (row) => <span className={styles["cell-text"]}>{row.type}</span>,
        enableSorting: true,
        filterRenderer: (
          <input
            className={styles["filter-input"]}
            name="sunqar-news-related-table-type"
            placeholder={t("news.related-table.type-filter-placeholder")}
            type="search"
            value={filters.type}
            onChange={(event) => {
              resetTableNavigation();
              setFilters((current) => ({ ...current, type: event.target.value }));
            }}
          />
        ),
        header: t("news.related-table.type"),
        id: "type",
        isFilterActive: filters.type.trim().length > 0,
        minSize: 120,
        size: 140,
      },
      {
        cell: (row) => (
          <span className={styles["cell-text"]}>
            {dateFormatter.format(new Date(row.publishedat * 1000))}
          </span>
        ),
        enableSorting: true,
        filterRenderer: (
          <div className={styles["date-filter-grid"]}>
            <input
              className={styles["filter-input"]}
              name="sunqar-news-related-table-published-from"
              type="datetime-local"
              value={filters.publishedFrom}
              onChange={(event) => {
                resetTableNavigation();
                setFilters((current) => ({ ...current, publishedFrom: event.target.value }));
              }}
            />
            <input
              className={styles["filter-input"]}
              name="sunqar-news-related-table-published-to"
              type="datetime-local"
              value={filters.publishedTo}
              onChange={(event) => {
                resetTableNavigation();
                setFilters((current) => ({ ...current, publishedTo: event.target.value }));
              }}
            />
          </div>
        ),
        header: t("news.related-table.published-at"),
        id: "publishedat",
        isFilterActive: filters.publishedFrom.trim().length > 0 || filters.publishedTo.trim().length > 0,
        minSize: 210,
        size: 200,
      },
      {
        cell: (row) => <span className={styles["cell-text"]}>{row.source}</span>,
        enableSorting: true,
        filterRenderer: (
          <input
            className={styles["filter-input"]}
            name="sunqar-news-related-table-source"
            placeholder={t("news.related-table.source-filter-placeholder")}
            type="search"
            value={filters.source}
            onChange={(event) => {
              resetTableNavigation();
              setFilters((current) => ({ ...current, source: event.target.value }));
            }}
          />
        ),
        header: t("news.related-table.source"),
        id: "source",
        isFilterActive: filters.source.trim().length > 0,
        minSize: 180,
        size: 200,
      },
      {
        cell: (row) =>
          isValidExternalUrl(row.url) ? (
            <a className={styles["news-link"]} href={row.url} rel="noreferrer" target="_blank">
              {row.title || row.url}
            </a>
          ) : (
            <span className={styles["cell-text"]}>{row.title}</span>
          ),
        enableSorting: true,
        filterRenderer: (
          <input
            className={styles["filter-input"]}
            name="sunqar-news-related-table-title"
            placeholder={t("news.related-table.title-filter-placeholder")}
            type="search"
            value={filters.title}
            onChange={(event) => {
              resetTableNavigation();
              setFilters((current) => ({ ...current, title: event.target.value }));
            }}
          />
        ),
        header: t("news.related-table.article"),
        id: "title",
        isFilterActive: filters.title.trim().length > 0,
        minSize: 260,
        size: 500,
      },
      {
        cell: (row) => <span className={styles["cell-text"]}>{String(row.similarity)}</span>,
        enableSorting: true,
        filterRenderer: (
          <div className={styles["date-filter-grid"]}>
            <input
              className={styles["filter-input"]}
              name="sunqar-news-related-table-similarity-from"
              placeholder={t("news.related-table.similarity-from-filter-placeholder")}
              step="any"
              type="number"
              value={filters.similarityFrom}
              onChange={(event) => {
                resetTableNavigation();
                setFilters((current) => ({ ...current, similarityFrom: event.target.value }));
              }}
            />
            <input
              className={styles["filter-input"]}
              name="sunqar-news-related-table-similarity-to"
              placeholder={t("news.related-table.similarity-to-filter-placeholder")}
              step="any"
              type="number"
              value={filters.similarityTo}
              onChange={(event) => {
                resetTableNavigation();
                setFilters((current) => ({ ...current, similarityTo: event.target.value }));
              }}
            />
          </div>
        ),
        header: t("news.related-table.similarity"),
        id: "similarity",
        isFilterActive: filters.similarityFrom.trim().length > 0 || filters.similarityTo.trim().length > 0,
        minSize: 130,
        size: 140,
      },
    ],
    [dateFormatter, filters, resetTableNavigation, t],
  );

  return (
    <section className={styles["news-page-related-table"]}>
      <h2 className={styles["news-page-related-table-title"]}>{t("news.related-table.title")}</h2>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        labels={{
          empty: t("news.related-table.empty"),
          error: t("news.related-table.error"),
          firstPage: t("news.table.first-page"),
          filterColumn: t("news.table.filter-column"),
          lastPage: t("news.table.last-page"),
          loading: t("news.related-table.loading"),
          nextPage: t("news.table.next-page"),
          page: (currentPage, totalPages) =>
            t("news.table.page", {
              currentPage,
              totalPages,
            }),
          pageSize: t("news.table.page-size"),
          previousPage: t("news.table.previous-page"),
          resizeColumn: t("news.table.resize-column"),
          sortAscending: t("news.table.sort-ascending"),
          sortCleared: t("news.table.sort-cleared"),
          sortDescending: t("news.table.sort-descending"),
          selectedRows: (count) => t("news.table.selected-rows", { count }),
        }}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageSizeOptions={NEWS_TABLE_PAGE_SIZES}
        selectedRowIds={selectedRowIds}
        sort={sort}
        status={state.status}
        storageKey={NEWS_RELATED_TABLE_COLUMN_WIDTHS_STORAGE_KEY}
        total={total}
        onPageChange={(nextPageIndex) => {
          setPageState({
            newsId: activeNewsId,
            pageIndex: nextPageIndex,
          });
        }}
        onPageSizeChange={(nextPageSize) => {
          if (NEWS_TABLE_PAGE_SIZES.some((availablePageSize) => availablePageSize === nextPageSize)) {
            setPageSize(nextPageSize as NewsTablePageSize);
            setPageState({
              newsId: activeNewsId,
              pageIndex: 0,
            });
          }
        }}
        onSelectedRowIdsChange={(rowIds) => {
          setSelectionState({
            newsId: activeNewsId,
            rowIds,
          });
        }}
        onSortChange={(nextSort) => {
          resetTableNavigation();
          setSort(nextSort);
        }}
      />
    </section>
  );
}
