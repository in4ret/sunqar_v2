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

export type DataTableSelectionMode = "multiple" | "none";

type DataTableProps<TData> = {
  activeRowId?: string | null;
  columns: Array<DataTableColumn<TData>>;
  data: TData[];
  getRowId: (row: TData) => string;
  labels: DataTableLabels;
  onActiveRowIdChange?: (rowId: string) => void;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelectedRowIdsChange?: (selectedRowIds: Set<string>) => void;
  onSortChange: (sort: DataTableSort) => void;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  selectedRowIds?: Set<string>;
  selectionMode?: DataTableSelectionMode;
  sort: DataTableSort;
  stickyHeaderWithScrollableRows?: boolean;
  status: "error" | "loading" | "success";
  storageKey?: string;
  total: number;
};

type StoredColumnSizing = Record<string, number>;
type FilterPopoverPosition = {
  alignment: "left" | "right";
  offset: number;
};

const SELECTION_COLUMN_ID = "select";
const EMPTY_SELECTED_ROW_IDS = new Set<string>();

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

function clampFilterPopoverOffset(
  baseLeft: number,
  popoverWidth: number,
  viewportLeft: number,
  viewportRight: number,
) {
  let offset = 0;
  const baseRight = baseLeft + popoverWidth;

  if (baseLeft < viewportLeft) {
    offset += viewportLeft - baseLeft;
  }

  if (baseRight + offset > viewportRight) {
    offset -= baseRight + offset - viewportRight;
  }

  return offset;
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
  selectedRowIds = EMPTY_SELECTED_ROW_IDS,
  selectionMode = "multiple",
  sort,
  stickyHeaderWithScrollableRows = false,
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
  const isSelectionEnabled = selectionMode === "multiple";
  const resolvedSelectedRowIds = isSelectionEnabled ? selectedRowIds : new Set<string>();
  const isEveryVisibleRowSelected =
    hasRows &&
    isInteractiveRows &&
    isSelectionEnabled &&
    data.every((row) => resolvedSelectedRowIds.has(getRowId(row)));
  const isSomeVisibleRowSelected =
    isSelectionEnabled && data.some((row) => resolvedSelectedRowIds.has(getRowId(row)));
  const bodyClassName = [
    styles["data-table-body"],
    showStatusOverlay ? styles["data-table-body-stale"] : "",
  ]
    .filter(Boolean)
    .join(" ");
  const shellClassName = [
    styles["data-table-shell"],
    stickyHeaderWithScrollableRows ? styles["data-table-shell-fill-height"] : "",
  ]
    .filter(Boolean)
    .join(" ");
  const bodyViewportClassName = [styles["data-table-body-viewport"]].filter(Boolean).join(" ");
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const filterPopoverRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const filterRootRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const syncedBodyViewportRef = useRef<HTMLDivElement | null>(null);
  const syncedHeaderViewportRef = useRef<HTMLDivElement | null>(null);
  const [openFilterColumnId, setOpenFilterColumnId] = useState<string | null>(null);
  const [filterPopoverPosition, setFilterPopoverPosition] = useState<FilterPopoverPosition | null>(null);
  const [scrollbarCompensation, setScrollbarCompensation] = useState(0);

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
    if (isSelectionEnabled && headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeVisibleRowSelected && !isEveryVisibleRowSelected;
    }
  }, [isEveryVisibleRowSelected, isSelectionEnabled, isSomeVisibleRowSelected]);

  useEffect(() => {
    if (!openFilterColumnId) {
      setFilterPopoverPosition(null);
      return;
    }

    function updateFilterPopoverPosition() {
      const filterColumnId = openFilterColumnId ?? "";
      const filterRoot = filterRootRefs.current[filterColumnId];
      const filterPopover = filterPopoverRefs.current[filterColumnId];
      const viewportElement = stickyHeaderWithScrollableRows
        ? syncedBodyViewportRef.current
        : scrollViewportRef.current;

      if (!filterRoot || !filterPopover || !viewportElement) {
        return;
      }

      const filterRootRect = filterRoot.getBoundingClientRect();
      const filterPopoverRect = filterPopover.getBoundingClientRect();
      const viewportRect = viewportElement.getBoundingClientRect();
      const shouldAlignLeft = filterRootRect.right - filterPopoverRect.width < viewportRect.left;
      const alignment = shouldAlignLeft ? "left" : "right";
      const baseLeft = shouldAlignLeft
        ? filterRootRect.left
        : filterRootRect.right - filterPopoverRect.width;
      const offset = clampFilterPopoverOffset(
        baseLeft,
        filterPopoverRect.width,
        viewportRect.left,
        viewportRect.right,
      );

      setFilterPopoverPosition((currentPosition) =>
        currentPosition?.alignment === alignment && currentPosition.offset === offset
          ? currentPosition
          : {
              alignment,
              offset,
            },
      );
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

    const viewportElement = stickyHeaderWithScrollableRows
      ? syncedBodyViewportRef.current
      : scrollViewportRef.current;

    updateFilterPopoverPosition();

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateFilterPopoverPosition);
    viewportElement?.addEventListener("scroll", updateFilterPopoverPosition, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateFilterPopoverPosition);
      viewportElement?.removeEventListener("scroll", updateFilterPopoverPosition);
    };
  }, [openFilterColumnId, stickyHeaderWithScrollableRows]);

  useEffect(() => {
    if (!stickyHeaderWithScrollableRows) {
      setScrollbarCompensation(0);
      return;
    }

    function updateScrollbarCompensation() {
      const viewportElement = syncedBodyViewportRef.current;

      if (!viewportElement) {
        setScrollbarCompensation(0);
        return;
      }

      const nextCompensation = Math.max(0, viewportElement.offsetWidth - viewportElement.clientWidth);

      setScrollbarCompensation((currentValue) =>
        currentValue === nextCompensation ? currentValue : nextCompensation,
      );
    }

    updateScrollbarCompensation();
    window.addEventListener("resize", updateScrollbarCompensation);

    return () => {
      window.removeEventListener("resize", updateScrollbarCompensation);
    };
  }, [columns, data.length, pageSize, showStatusOverlay, status, stickyHeaderWithScrollableRows, total]);

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
    "--data-table-scrollbar-compensation": `${scrollbarCompensation}px`,
    "--data-table-total-width": `calc(${columnWidthValues.join(" + ")})`,
  } as CSSProperties & Record<string, string>;

  function handleVisibleRowsSelectionChange(checked: boolean) {
    if (!isSelectionEnabled) {
      return;
    }

    const nextSelection = new Set(selectedRowIds);

    for (const row of data) {
      const rowId = getRowId(row);

      if (checked) {
        nextSelection.add(rowId);
        continue;
      }

      nextSelection.delete(rowId);
    }

    onSelectedRowIdsChange?.(nextSelection);
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

  function renderHeader() {
    return (
      <div className={styles["data-table-head"]} role="rowgroup">
        {table.getHeaderGroups().map((headerGroup) => (
          <div className={styles["data-table-row"]} key={headerGroup.id} role="row">
            {headerGroup.headers.map((header, index) => {
              const column = columns[index];
              const isSelectionColumn = isSelectionEnabled && column?.id === SELECTION_COLUMN_ID;
              const canSort = column?.enableSorting ?? false;
              const filterPopoverId = `data-table-filter-${header.id}`;
              const isFilterOpen = openFilterColumnId === header.column.id;
              const resolvedFilterPopoverPosition = isFilterOpen
                ? (filterPopoverPosition ?? {
                    alignment: "right",
                    offset: 0,
                  })
                : null;
              const filterButtonClassName = [
                styles["filter-button"],
                column?.isFilterActive ? styles["filter-button-active"] : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  className={styles["data-table-header-cell"]}
                  data-selection-cell={isSelectionColumn ? "true" : undefined}
                  key={header.id}
                  role="columnheader"
                >
                  <div className={styles["header-content"]}>
                    {isSelectionColumn ? (
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
                            ref={(element) => {
                              filterPopoverRefs.current[header.column.id] = element;
                            }}
                            className={[
                              styles["filter-popover"],
                              resolvedFilterPopoverPosition?.alignment === "left"
                                ? styles["filter-popover-align-left"]
                                : styles["filter-popover-align-right"],
                            ].join(" ")}
                            id={filterPopoverId}
                            role="dialog"
                            style={
                              {
                                "--filter-popover-offset": `${resolvedFilterPopoverPosition?.offset ?? 0}px`,
                              } as CSSProperties
                            }
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
    );
  }

  function renderBody() {
    return (
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
                data-selected={isSelectionEnabled && resolvedSelectedRowIds.has(rowId)}
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
                {row.getVisibleCells().map((cell, index) => {
                  const column = columns[index];
                  const isSelectionColumn = isSelectionEnabled && column?.id === SELECTION_COLUMN_ID;

                  return (
                    <div
                      className={styles["data-table-cell"]}
                      data-selection-cell={isSelectionColumn ? "true" : undefined}
                      key={cell.id}
                      role="cell"
                    >
                      {isSelectionColumn ? (
                        <input
                          checked={resolvedSelectedRowIds.has(rowId)}
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

                            onSelectedRowIdsChange?.(nextSelection);
                          }}
                        />
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </div>
                  );
                })}
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
    );
  }

  return (
    <section className={shellClassName} style={tableStyle} onKeyDown={handleTableKeyDown}>
      <div className={styles["data-table-toolbar"]}>
        {isSelectionEnabled ? (
          <div className={styles["data-table-toolbar-group"]}>
            <span className={styles["selected-count"]}>{labels.selectedRows(resolvedSelectedRowIds.size)}</span>
          </div>
        ) : null}
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
      {stickyHeaderWithScrollableRows ? (
        <div className={styles["data-table-synced-shell"]} role="table">
          <div
            ref={syncedHeaderViewportRef}
            aria-hidden="true"
            className={styles["data-table-synced-header-viewport"]}
          >
            <div className={styles["data-table-synced-content"]}>{renderHeader()}</div>
          </div>
          <div
            className={styles["data-table-synced-body-viewport"]}
            ref={syncedBodyViewportRef}
            onScroll={(event) => {
              if (syncedHeaderViewportRef.current) {
                syncedHeaderViewportRef.current.scrollLeft = event.currentTarget.scrollLeft;
              }
            }}
          >
            <div className={styles["data-table-synced-content"]}>{renderBody()}</div>
          </div>
        </div>
      ) : (
        <div className={styles["data-table-scroll"]} ref={scrollViewportRef}>
          <div className={styles["data-table"]} role="table">
            {renderHeader()}
            <div className={bodyViewportClassName}>{renderBody()}</div>
          </div>
        </div>
      )}
    </section>
  );
}
