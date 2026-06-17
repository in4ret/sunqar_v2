"use client";

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
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
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
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
  enableResizing?: boolean;
  enableSorting?: boolean;
  filterRenderer?: ReactNode;
  header: ReactNode;
  id: string;
  isFilterActive?: boolean;
  maxSize?: number;
  minSize?: number;
  size: number;
  width?: string;
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
  activeRowId?: string | null;
  columns: Array<DataTableColumn<TData>>;
  data: TData[];
  getRowId: (row: TData) => string;
  labels: DataTableLabels;
  onActiveRowIdChange?: (rowId: string) => void;
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

const INTERACTIVE_ROW_TARGET_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "[role='button']",
  "[role='checkbox']",
  "[role='link']",
  "[role='menuitem']",
  "[role='option']",
  "[role='switch']",
  "[role='textbox']",
].join(",");

const ARROW_NAVIGATION_NATIVE_TARGET_SELECTOR = [
  "textarea",
  "select",
  "input:not([type='checkbox']):not([type='radio'])",
  "[contenteditable='true']",
  "[role='combobox']",
  "[role='listbox']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='textbox']",
].join(",");

function getDefaultColumnSizing<TData>(columns: Array<DataTableColumn<TData>>) {
  return Object.fromEntries(columns.map((column) => [column.id, column.size]));
}

function getStoredColumnSizing<TData>(
  columns: Array<DataTableColumn<TData>>,
  storageKey: string | undefined,
): StoredColumnSizing {
  const storedColumnSizing = readStoredColumnSizing(storageKey);

  return Object.fromEntries(
    columns
      .filter((column) => column.enableResizing !== false)
      .map((column) => [column.id, storedColumnSizing[column.id]])
      .filter((entry): entry is [string, number] => typeof entry[1] === "number"),
  );
}

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

function isInteractiveRowTarget(target: EventTarget | null, rowElement: HTMLElement) {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactiveElement = target.closest(INTERACTIVE_ROW_TARGET_SELECTOR);

  return interactiveElement !== null && rowElement.contains(interactiveElement);
}

function isNativeArrowNavigationTarget(target: EventTarget | null, tableElement: HTMLElement) {
  if (!(target instanceof Element)) {
    return false;
  }

  const nativeNavigationElement = target.closest(ARROW_NAVIGATION_NATIVE_TARGET_SELECTOR);

  return nativeNavigationElement !== null && tableElement.contains(nativeNavigationElement);
}

export function DataTable<TData>({
  activeRowId,
  columns,
  data,
  getRowId,
  labels,
  onActiveRowIdChange,
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
    getDefaultColumnSizing(columns),
  );
  const [loadedColumnSizingStorageKey, setLoadedColumnSizingStorageKey] = useState<string | null>(null);
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
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [openFilterColumnId, setOpenFilterColumnId] = useState<string | null>(null);

  useEffect(() => {
    setColumnSizing((currentSizing) => ({
      ...getDefaultColumnSizing(columns),
      ...currentSizing,
      ...getStoredColumnSizing(columns, storageKey),
      ...Object.fromEntries(
        columns
          .filter((column) => column.enableResizing === false)
          .map((column) => [column.id, column.size]),
      ),
    }));
    setLoadedColumnSizingStorageKey(storageKey ?? null);
  }, [columns, storageKey]);

  useEffect(() => {
    if (
      !storageKey ||
      loadedColumnSizingStorageKey !== storageKey ||
      typeof window === "undefined"
    ) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(columnSizing));
  }, [columnSizing, loadedColumnSizingStorageKey, storageKey]);

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
        enableResizing: column.enableResizing ?? true,
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
  const activeVisibleRowIndex = rows.findIndex((row) => row.id === activeRowId);
  const rovingTabIndexRowId =
    activeVisibleRowIndex >= 0 ? rows[activeVisibleRowIndex]?.id : rows[0]?.id;
  const columnsById = new Map(columns.map((column) => [column.id, column]));
  const columnSizeVars = table.getFlatHeaders().reduce<Record<string, string>>((vars, header) => {
    const column = columnsById.get(header.column.id);

    vars[`--data-table-column-${header.column.id}-width`] = column?.width ?? `${header.getSize()}px`;

    return vars;
  }, {});
  const columnWidthValues = table
    .getFlatHeaders()
    .map((header) => `var(--data-table-column-${header.column.id}-width)`);
  const gridTemplateColumns = columnWidthValues.join(" ");
  const tableStyle = {
    ...columnSizeVars,
    "--data-table-grid-template-columns": gridTemplateColumns,
    "--data-table-total-width": `calc(${columnWidthValues.join(" + ")})`,
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

  function activateRow(rowId: string) {
    if (isInteractiveRows) {
      onActiveRowIdChange?.(rowId);
    }
  }

  function focusRow(rowId: string) {
    window.requestAnimationFrame(() => {
      rowRefs.current[rowId]?.focus();
    });
  }

  function handleTableKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (
      event.defaultPrevented ||
      !onActiveRowIdChange ||
      !isInteractiveRows ||
      (event.key !== "ArrowDown" && event.key !== "ArrowUp") ||
      isNativeArrowNavigationTarget(event.target, event.currentTarget)
    ) {
      return;
    }

    const focusedRowElement =
      event.target instanceof Element ? event.target.closest("[data-row-navigation-row='true']") : null;
    const focusedRowIndex =
      focusedRowElement instanceof HTMLElement
        ? rows.findIndex((row) => rowRefs.current[row.id] === focusedRowElement)
        : -1;
    const nextRowIndex =
      focusedRowIndex >= 0
        ? event.key === "ArrowDown"
          ? Math.min(focusedRowIndex + 1, rows.length - 1)
          : Math.max(focusedRowIndex - 1, 0)
        : activeVisibleRowIndex >= 0
          ? activeVisibleRowIndex
          : 0;
    const nextRowId = rows[nextRowIndex]?.id;

    if (!nextRowId) {
      return;
    }

    event.preventDefault();
    activateRow(nextRowId);
    focusRow(nextRowId);
  }

  function handleRowClick(event: ReactMouseEvent<HTMLDivElement>, rowId: string) {
    if (
      !onActiveRowIdChange ||
      !isInteractiveRows ||
      isInteractiveRowTarget(event.target, event.currentTarget)
    ) {
      return;
    }

    activateRow(rowId);
    event.currentTarget.focus();
  }

  function handleRowKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
    rowIndex: number,
    rowId: string,
  ) {
    if (
      !onActiveRowIdChange ||
      !isInteractiveRows ||
      isInteractiveRowTarget(event.target, event.currentTarget)
    ) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      activateRow(rowId);
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();

    const nextRowIndex =
      event.key === "ArrowDown"
        ? Math.min(rowIndex + 1, rows.length - 1)
        : Math.max(rowIndex - 1, 0);
    const nextRowId = rows[nextRowIndex]?.id;

    if (!nextRowId) {
      return;
    }

    activateRow(nextRowId);
    focusRow(nextRowId);
  }

  return (
    <section className={styles["data-table-shell"]} style={tableStyle} onKeyDown={handleTableKeyDown}>
      <div className={styles["data-table-toolbar"]}>
        <div className={styles["data-table-toolbar-group"]}>
          <span className={styles["selected-count"]}>{labels.selectedRows(selectedRowIds.size)}</span>
        </div>
        <div className={styles["data-table-toolbar-group"]}>
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
          <div className={styles["pagination"]}>
            <button
              aria-label={labels.firstPage}
              className={styles["page-button"]}
              disabled={pageIndex === 0}
              title={labels.firstPage}
              type="button"
              onClick={() => onPageChange(0)}
            >
              <ChevronsLeftIcon className={styles["page-button-icon"]} />
            </button>
            <button
              aria-label={labels.previousPage}
              className={styles["page-button"]}
              disabled={pageIndex === 0}
              title={labels.previousPage}
              type="button"
              onClick={() => onPageChange(Math.max(pageIndex - 1, 0))}
            >
              <ChevronLeftIcon className={styles["page-button-icon"]} />
            </button>
            <span className={styles["page-status"]}>{labels.page(currentPage, totalPages)}</span>
            <button
              aria-label={labels.nextPage}
              className={styles["page-button"]}
              disabled={pageIndex >= totalPages - 1}
              title={labels.nextPage}
              type="button"
              onClick={() => onPageChange(Math.min(pageIndex + 1, totalPages - 1))}
            >
              <ChevronRightIcon className={styles["page-button-icon"]} />
            </button>
            <button
              aria-label={labels.lastPage}
              className={styles["page-button"]}
              disabled={pageIndex >= totalPages - 1}
              title={labels.lastPage}
              type="button"
              onClick={() => onPageChange(totalPages - 1)}
            >
              <ChevronsRightIcon className={styles["page-button-icon"]} />
            </button>
          </div>
        </div>
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
              rows.map((row, rowIndex) => {
                const rowId = row.id;

                return (
                  <div
                    ref={(element) => {
                      rowRefs.current[rowId] = element;
                    }}
                    className={styles["data-table-row"]}
                    data-active={activeRowId === rowId}
                    data-row-navigation-row="true"
                    data-selected={selectedRowIds.has(rowId)}
                    key={rowId}
                    role="row"
                    tabIndex={
                      onActiveRowIdChange && isInteractiveRows && rovingTabIndexRowId === rowId
                        ? 0
                        : -1
                    }
                    onClick={(event) => handleRowClick(event, rowId)}
                    onKeyDown={(event) => handleRowKeyDown(event, rowIndex, rowId)}
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
    </section>
  );
}
