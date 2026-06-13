"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  DEFAULT_NEWS_TABLE_FILTERS,
  DEFAULT_NEWS_TABLE_PAGE_SIZE,
  NEWS_TABLE_PAGE_SIZES,
  type NewsTableFilters,
  type NewsTablePageSize,
  type NewsTableResult,
  type NewsTableRow,
  type NewsTableSort,
  type NewsTableSortField,
} from "@/lib/news/news-table.types";
import { formatDateTimeLocalValueToEpochSeconds } from "@/lib/utils";
import { DataTable, type DataTableColumn, type DataTableSort } from "@/ui";

import styles from "./news-page-table.module.scss";

type NewsPageTableProps = {
  hasLoadedStoredSources: boolean;
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
  searchTrigger: number;
  selectedSources: string[];
};

type TableState =
  | {
      status: "loading";
    }
  | {
      status: "error";
    }
  | {
      data: NewsTableResult;
      status: "success";
    };

type PageState = {
  pageIndex: number;
  querySignature: string;
};

type SelectionState = {
  querySignature: string;
  rowIds: Set<string>;
};

const NEWS_TABLE_COLUMN_WIDTHS_STORAGE_KEY = "sunqar-news-table-column-widths";
const FILTER_DEBOUNCE_MS = 350;
const SORT_FIELDS = new Set<NewsTableSortField>(["publishedat", "source", "title"]);

function isValidExternalUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function toNewsTableSort(sort: DataTableSort): NewsTableSort {
  if (!sort || !SORT_FIELDS.has(sort.field as NewsTableSortField)) {
    return null;
  }

  return {
    direction: sort.direction,
    field: sort.field as NewsTableSortField,
  };
}

function toApiFilters(filters: NewsTableFilters): NewsTableFilters {
  return {
    publishedFrom: formatDateTimeLocalValueToEpochSeconds(filters.publishedFrom),
    publishedTo: formatDateTimeLocalValueToEpochSeconds(filters.publishedTo),
    source: filters.source,
    title: filters.title,
  };
}

function isNewsTableResult(value: unknown): value is NewsTableResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<NewsTableResult>;

  return (
    Array.isArray(result.rows) &&
    typeof result.total === "number" &&
    typeof result.pageIndex === "number" &&
    typeof result.pageSize === "number" &&
    result.rows.every(
      (row) =>
        row &&
        typeof row === "object" &&
        typeof (row as Partial<NewsTableRow>).id === "string" &&
        typeof (row as Partial<NewsTableRow>).title === "string" &&
        typeof (row as Partial<NewsTableRow>).url === "string" &&
        typeof (row as Partial<NewsTableRow>).source === "string" &&
        typeof (row as Partial<NewsTableRow>).publishedat === "number",
    )
  );
}

export function NewsPageTable({
  hasLoadedStoredSources,
  searchFrom,
  searchQuery,
  searchTo,
  searchTrigger,
  selectedSources,
}: NewsPageTableProps) {
  const locale = useLocale();
  const t = useTranslations();
  const [state, setState] = useState<TableState>({ status: "loading" });
  const [lastSuccessfulData, setLastSuccessfulData] = useState<NewsTableResult | null>(null);
  const [filters, setFilters] = useState<NewsTableFilters>(DEFAULT_NEWS_TABLE_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<NewsTableFilters>(DEFAULT_NEWS_TABLE_FILTERS);
  const [sort, setSort] = useState<DataTableSort>(null);
  const [pageState, setPageState] = useState<PageState>({
    pageIndex: 0,
    querySignature: "",
  });
  const [pageSize, setPageSize] = useState<NewsTablePageSize>(DEFAULT_NEWS_TABLE_PAGE_SIZE);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    querySignature: "",
    rowIds: new Set(),
  });
  const selectedSourcesRef = useRef(selectedSources);
  const apiFilters = useMemo(() => toApiFilters(debouncedFilters), [debouncedFilters]);
  const selectedSourcesSignature = useMemo(() => selectedSources.join("\u0000"), [selectedSources]);
  const sortSignature = sort ? `${sort.field}:${sort.direction}` : "";
  const querySignature = useMemo(
    () =>
      JSON.stringify({
        filters: apiFilters,
        pageSize,
        searchFrom,
        searchQuery,
        searchTo,
        searchTrigger,
        selectedSourcesSignature,
        sort: sortSignature,
      }),
    [
      apiFilters,
      pageSize,
      searchFrom,
      searchQuery,
      searchTo,
      searchTrigger,
      selectedSourcesSignature,
      sortSignature,
    ],
  );
  const pageIndex = pageState.querySignature === querySignature ? pageState.pageIndex : 0;
  const selectedRowIds = selectionState.querySignature === querySignature ? selectionState.rowIds : new Set<string>();
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
    selectedSourcesRef.current = selectedSources;
  }, [selectedSources]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedFilters(filters);
    }, FILTER_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [filters]);

  useEffect(() => {
    if (!hasLoadedStoredSources) {
      return;
    }

    const abortController = new AbortController();

    async function loadTable() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/news/table", {
          body: JSON.stringify({
            from: searchFrom,
            pageIndex,
            pageSize,
            query: searchQuery,
            sort: toNewsTableSort(sort),
            sources: selectedSourcesRef.current,
            tableFilters: apiFilters,
            to: searchTo,
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

        if (!isNewsTableResult(payload)) {
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
  }, [
    apiFilters,
    hasLoadedStoredSources,
    pageIndex,
    pageSize,
    querySignature,
    searchFrom,
    searchQuery,
    searchTo,
    searchTrigger,
    selectedSourcesSignature,
    sort,
  ]);

  const visibleData = state.status === "success" ? state.data : lastSuccessfulData;
  const rows = visibleData?.rows ?? [];
  const total = visibleData?.total ?? 0;
  const columns = useMemo<Array<DataTableColumn<NewsTableRow>>>(
    () => [
      {
        cell: () => null,
        header: <span className={styles["sr-only"]}>{t("news.table.select")}</span>,
        id: "select",
        maxSize: 120,
        minSize: 76,
        size: 100,
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
            name="sunqar-news-table-title"
            placeholder={t("news.table.title-filter-placeholder")}
            type="search"
            value={filters.title}
            onChange={(event) => {
              setSelectionState({
                querySignature,
                rowIds: new Set(),
              });
              setFilters((current) => ({ ...current, title: event.target.value }));
            }}
          />
        ),
        header: t("news.table.title"),
        id: "title",
        isFilterActive: filters.title.trim().length > 0,
        minSize: 260,
        size: 500,
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
              name="sunqar-news-table-published-from"
              type="datetime-local"
              value={filters.publishedFrom}
              onChange={(event) => {
                setSelectionState({
                  querySignature,
                  rowIds: new Set(),
                });
                setFilters((current) => ({ ...current, publishedFrom: event.target.value }));
              }}
            />
            <input
              className={styles["filter-input"]}
              name="sunqar-news-table-published-to"
              type="datetime-local"
              value={filters.publishedTo}
              onChange={(event) => {
                setSelectionState({
                  querySignature,
                  rowIds: new Set(),
                });
                setFilters((current) => ({ ...current, publishedTo: event.target.value }));
              }}
            />
          </div>
        ),
        header: t("news.table.published-at"),
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
            name="sunqar-news-table-source"
            placeholder={t("news.table.source-filter-placeholder")}
            type="search"
            value={filters.source}
            onChange={(event) => {
              setSelectionState({
                querySignature,
                rowIds: new Set(),
              });
              setFilters((current) => ({ ...current, source: event.target.value }));
            }}
          />
        ),
        header: t("news.table.source"),
        id: "source",
        isFilterActive: filters.source.trim().length > 0,
        minSize: 180,
        size: 200,
      },
    ],
    [dateFormatter, filters, querySignature, t],
  );

  return (
    <section className={styles["news-page-table"]}>
      <header className={styles["table-header"]}>
        <h2 className={styles["table-title"]}>{t("news.table.heading")}</h2>
      </header>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        labels={{
          empty: t("news.table.empty"),
          error: t("news.table.error"),
          firstPage: t("news.table.first-page"),
          filterColumn: t("news.table.filter-column"),
          lastPage: t("news.table.last-page"),
          loading: t("news.table.loading"),
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
        storageKey={NEWS_TABLE_COLUMN_WIDTHS_STORAGE_KEY}
        total={total}
        onPageChange={(nextPageIndex) => {
          setPageState({
            pageIndex: nextPageIndex,
            querySignature,
          });
        }}
        onPageSizeChange={(nextPageSize) => {
          if (NEWS_TABLE_PAGE_SIZES.some((availablePageSize) => availablePageSize === nextPageSize)) {
            setPageSize(nextPageSize as NewsTablePageSize);
          }
        }}
        onSelectedRowIdsChange={(rowIds) => {
          setSelectionState({
            querySignature,
            rowIds,
          });
        }}
        onSortChange={setSort}
      />
    </section>
  );
}
