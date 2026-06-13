"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  ArrowDownNarrowWideIcon,
  ArrowUpWideNarrowIcon,
  FunnelIcon,
} from "../icon/icon";

import styles from "./data-table.module.scss";

export type DataTableSortDirection = "asc" | "desc";

export type DataTableSort = {
  direction: DataTableSortDirection;
  field: string;
} | null;

export type DataTableColumn<TData> = {
  cell: (row: TData) => ReactNode;
  enableSorting?: boolean;
  filterRenderer?: ReactNode;
  header: ReactNode;
  id: string;
  isFilterActive?: boolean;
  maxSize?: number;
  minSize?: number;
  size: number;
};

export type DataTableLabels = {
  empty: string;
  error: string;
  firstPage: string;
  filterColumn: string;
  lastPage: string;
  loading: string;
  nextPage: string;
  page: (currentPage: number, totalPages: number) => string;
  pageSize: string;
  previousPage: string;
  resizeColumn: string;
  sortAscending: string;
  sortCleared: string;
  sortDescending: string;
  selectedRows: (count: number) => string;
};

type DataTableProps<TData> = {
  columns: Array<DataTableColumn<TData>>;
  data: TData[];
  getRowId: (row: TData) => string;
  labels: DataTableLabels;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelectedRowIdsChange: (selectedRowIds: Set<string>) => void;
  onSortChange: (sort: DataTableSort) => void;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  selectedRowIds: Set<string>;
  sort: DataTableSort;
  status: "error" | "loading" | "success";
  storageKey?: string;
  total: number;
};

type StoredColumnSizing = Record<string, number>;

function getNextSort(currentSort: DataTableSort, columnId: string): DataTableSort {
  if (!currentSort || currentSort.field !== columnId) {
    return {
      direction: "asc",
      field: columnId,
    };
  }

  if (currentSort.direction === "asc") {
    return {
      direction: "desc",
      field: columnId,
    };
  }

  return null;
}

function getSortIndicator(sort: DataTableSort, columnId: string) {
  if (!sort || sort.field !== columnId) {
    return null;
  }

  return sort.direction === "asc" ? <ArrowUpWideNarrowIcon /> : <ArrowDownNarrowWideIcon />;
}

function readStoredColumnSizing(storageKey: string | undefined): StoredColumnSizing {
  if (!storageKey || typeof window === "undefined") {
    return {};
  }

  try {
    const parsedValue = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");

    if (!parsedValue || typeof parsedValue !== "object") {
      return {};
    }

    return parsedValue as StoredColumnSizing;
  } catch {
    return {};
  }
}

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  labels,
  onPageChange,
  onPageSizeChange,
  onSelectedRowIdsChange,
  onSortChange,
  pageIndex,
  pageSize,
  pageSizeOptions,
  selectedRowIds,
  sort,
  status,
  storageKey,
  total,
}: DataTableProps<TData>) {
  const [columnSizing, setColumnSizing] = useState<StoredColumnSizing>(() =>
    ({
      ...Object.fromEntries(columns.map((column) => [column.id, column.size])),
      ...readStoredColumnSizing(storageKey),
    }),
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(pageIndex + 1, totalPages);
  const hasRows = data.length > 0;
  const isInteractiveRows = status === "success";
  const showStatusOverlay = (status === "loading" || status === "error") && hasRows;
  const isEveryVisibleRowSelected =
    hasRows && isInteractiveRows && data.every((row) => selectedRowIds.has(getRowId(row)));
  const isSomeVisibleRowSelected = data.some((row) => selectedRowIds.has(getRowId(row)));
  const bodyClassName = [
    styles["data-table-body"],
    showStatusOverlay ? styles["data-table-body-stale"] : "",
  ]
    .filter(Boolean)
    .join(" ");
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const filterRootRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [openFilterColumnId, setOpenFilterColumnId] = useState<string | null>(null);

  useEffect(() => {
    setColumnSizing((currentSizing) => ({
      ...Object.fromEntries(columns.map((column) => [column.id, column.size])),
      ...currentSizing,
      ...readStoredColumnSizing(storageKey),
    }));
  }, [columns, storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(columnSizing));
  }, [columnSizing, storageKey]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeVisibleRowSelected && !isEveryVisibleRowSelected;
    }
  }, [isEveryVisibleRowSelected, isSomeVisibleRowSelected]);

  useEffect(() => {
    if (!openFilterColumnId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const filterRoot = filterRootRefs.current[openFilterColumnId ?? ""];

      if (filterRoot?.contains(event.target as Node)) {
        return;
      }

      setOpenFilterColumnId(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenFilterColumnId(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openFilterColumnId]);

  const tableColumns = useMemo<Array<ColumnDef<TData>>>(
    () =>
      columns.map((column) => ({
        cell: ({ row }) => column.cell(row.original),
        enableSorting: column.enableSorting ?? false,
        header: () => column.header,
        id: column.id,
        maxSize: column.maxSize,
        minSize: column.minSize,
        size: columnSizing[column.id] ?? column.size,
      })),
    [columnSizing, columns],
  );
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: tableColumns,
    data,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
    manualSorting: true,
    onColumnSizingChange: setColumnSizing,
    rowCount: total,
    state: {
      columnSizing,
    },
  });
  const rows = table.getRowModel().rows;
  const columnSizeVars = table.getFlatHeaders().reduce<Record<string, string>>((vars, header) => {
    vars[`--data-table-column-${header.column.id}-width`] = `${header.getSize()}px`;

    return vars;
  }, {});
  const gridTemplateColumns = table
    .getFlatHeaders()
    .map((header) => `var(--data-table-column-${header.column.id}-width)`)
    .join(" ");
  const tableStyle = {
    ...columnSizeVars,
    "--data-table-grid-template-columns": gridTemplateColumns,
    "--data-table-total-width": `${table.getTotalSize()}px`,
  } as CSSProperties & Record<string, string>;

  function handleVisibleRowsSelectionChange(checked: boolean) {
    const nextSelection = new Set(selectedRowIds);

    for (const row of data) {
      const rowId = getRowId(row);

      if (checked) {
        nextSelection.add(rowId);
        continue;
      }

      nextSelection.delete(rowId);
    }

    onSelectedRowIdsChange(nextSelection);
  }

  return (
    <section className={styles["data-table-shell"]} style={tableStyle}>
      <div className={styles["data-table-toolbar"]}>
        <span className={styles["selected-count"]}>{labels.selectedRows(selectedRowIds.size)}</span>
        <label className={styles["page-size-label"]}>
          <span>{labels.pageSize}</span>
          <select
            className={styles["page-size-select"]}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles["data-table-scroll"]}>
        <div className={styles["data-table"]} role="table">
          <div className={styles["data-table-head"]} role="rowgroup">
            {table.getHeaderGroups().map((headerGroup) => (
              <div className={styles["data-table-row"]} key={headerGroup.id} role="row">
                {headerGroup.headers.map((header, index) => {
                  const column = columns[index];
                  const canSort = column?.enableSorting ?? false;
                  const filterPopoverId = `data-table-filter-${header.id}`;
                  const isFilterOpen = openFilterColumnId === header.column.id;
                  const filterButtonClassName = [
                    styles["filter-button"],
                    column?.isFilterActive ? styles["filter-button-active"] : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <div className={styles["data-table-header-cell"]} key={header.id} role="columnheader">
                      <div className={styles["header-content"]}>
                        {index === 0 ? (
                          <label className={styles["checkbox-label"]}>
                            <input
                              ref={headerCheckboxRef}
                              checked={isEveryVisibleRowSelected}
                              className={styles["checkbox"]}
                              disabled={!hasRows || !isInteractiveRows}
                              type="checkbox"
                              onChange={(event) => handleVisibleRowsSelectionChange(event.target.checked)}
                            />
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          </label>
                        ) : canSort ? (
                          <button
                            className={styles["sort-button"]}
                            type="button"
                            onClick={() => onSortChange(getNextSort(sort, header.column.id))}
                          >
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                            <span className={styles["sort-indicator"]}>
                              {getSortIndicator(sort, header.column.id)}
                            </span>
                          </button>
                        ) : (
                          <span className={styles["header-label"]}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                        )}
                        {column?.filterRenderer ? (
                          <div
                            ref={(element) => {
                              filterRootRefs.current[header.column.id] = element;
                            }}
                            className={styles["filter-control"]}
                          >
                            <button
                              aria-controls={filterPopoverId}
                              aria-expanded={isFilterOpen}
                              aria-haspopup="dialog"
                              aria-label={labels.filterColumn}
                              className={filterButtonClassName}
                              type="button"
                              onClick={() =>
                                setOpenFilterColumnId((currentColumnId) =>
                                  currentColumnId === header.column.id ? null : header.column.id,
                                )
                              }
                            >
                              <FunnelIcon className={styles["filter-icon"]} />
                            </button>
                            {isFilterOpen ? (
                              <div
                                className={styles["filter-popover"]}
                                id={filterPopoverId}
                                role="dialog"
                              >
                                {column.filterRenderer}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {header.column.getCanResize() ? (
                        <button
                          aria-label={labels.resizeColumn}
                          className={styles["resize-handle"]}
                          type="button"
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className={bodyClassName} role="rowgroup">
            {status === "loading" && !hasRows ? (
              <div className={styles["state-row"]}>{labels.loading}</div>
            ) : null}
            {status === "error" && !hasRows ? (
              <div className={styles["state-row"]}>{labels.error}</div>
            ) : null}
            {status === "success" && data.length === 0 ? (
              <div className={styles["state-row"]}>{labels.empty}</div>
            ) : null}
            {hasRows ? (
              rows.map((row) => {
                const rowId = row.id;

                return (
                  <div
                    className={styles["data-table-row"]}
                    data-selected={selectedRowIds.has(rowId)}
                    key={rowId}
                    role="row"
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <div className={styles["data-table-cell"]} key={cell.id} role="cell">
                        {index === 0 ? (
                          <input
                            checked={selectedRowIds.has(rowId)}
                            className={styles["checkbox"]}
                            disabled={!isInteractiveRows}
                            type="checkbox"
                            onChange={(event) => {
                              const nextSelection = new Set(selectedRowIds);

                              if (event.target.checked) {
                                nextSelection.add(rowId);
                              } else {
                                nextSelection.delete(rowId);
                              }

                              onSelectedRowIdsChange(nextSelection);
                            }}
                          />
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </div>
                    ))}
                  </div>
                );
              })
            ) : null}
            {showStatusOverlay ? (
              <div className={styles["status-overlay"]} role="status">
                {status === "loading" ? labels.loading : labels.error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className={styles["pagination"]}>
        <button
          className={styles["page-button"]}
          disabled={pageIndex === 0}
          type="button"
          onClick={() => onPageChange(0)}
        >
          {labels.firstPage}
        </button>
        <button
          className={styles["page-button"]}
          disabled={pageIndex === 0}
          type="button"
          onClick={() => onPageChange(Math.max(pageIndex - 1, 0))}
        >
          {labels.previousPage}
        </button>
        <span className={styles["page-status"]}>{labels.page(currentPage, totalPages)}</span>
        <button
          className={styles["page-button"]}
          disabled={pageIndex >= totalPages - 1}
          type="button"
          onClick={() => onPageChange(Math.min(pageIndex + 1, totalPages - 1))}
        >
          {labels.nextPage}
        </button>
        <button
          className={styles["page-button"]}
          disabled={pageIndex >= totalPages - 1}
          type="button"
          onClick={() => onPageChange(totalPages - 1)}
        >
          {labels.lastPage}
        </button>
      </div>
    </section>
  );
}
