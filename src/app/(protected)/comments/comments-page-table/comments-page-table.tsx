"use client";

import {
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import {
  COMMENTS_TABLE_PAGE_SIZES,
  type CommentsTableFilters,
  type CommentsTablePageSize,
  type CommentsTableResult,
  type CommentsTableRow,
  type CommentsTableSort,
  type CommentsTableSortField,
  DEFAULT_COMMENTS_TABLE_FILTERS,
  DEFAULT_COMMENTS_TABLE_PAGE_SIZE,
} from "@/lib/comments/comments-table.types";
import { DataTable, type DataTableColumn, type DataTableSort as UiDataTableSort } from "@/ui";
import { FunnelPlusIcon, FunnelXIcon } from "@/ui/icon/icon";

import styles from "./comments-page-table.module.scss";

type CommentsPageTableProps = {
  hasLoadedStoredPosts: boolean;
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
  searchTrigger: number;
  selectedPosts: string[];
};

type TableState =
  | {
      status: "loading";
    }
  | {
      status: "error";
    }
  | {
      data: CommentsTableResult;
      status: "success";
    };

type PageState = {
  pageIndex: number;
  querySignature: string;
};

const COMMENTS_TABLE_COLUMN_WIDTHS_STORAGE_KEY = "sunqar-comments-table-column-widths";
const FILTER_DEBOUNCE_MS = 350;
const MAX_COMMENT_LENGTH = 500;
const SORT_FIELDS = new Set<CommentsTableSortField>([
  "call_to_action",
  "content_id",
  "likes",
  "threat",
  "toxic",
  "username",
]);
const SCORE_COLOR_STOPS = {
  error: {
    dark: [178, 75, 82],
    light: [249, 223, 223],
  },
  success: {
    dark: [45, 122, 87],
    light: [223, 244, 234],
  },
  warning: {
    dark: [182, 125, 24],
    light: [249, 235, 204],
  },
} as const;
const NEUTRAL_SCORE_CELL_STYLE = {
  "--score-cell-background-end": "var(--bg-elevated)",
  "--score-cell-background-start": "color-mix(in srgb, var(--bg-elevated) 92%, white)",
} as CSSProperties;

type RgbColor = readonly [number, number, number];

function clampScore(value: number) {
  return Math.max(0, Math.min(1, value));
}

function interpolateChannel(start: number, end: number, factor: number) {
  return Math.round(start + (end - start) * factor);
}

function interpolateRgbColor(start: RgbColor, end: RgbColor, factor: number): RgbColor {
  return [
    interpolateChannel(start[0], end[0], factor),
    interpolateChannel(start[1], end[1], factor),
    interpolateChannel(start[2], end[2], factor),
  ];
}

function mixRgbColor(color: RgbColor, target: RgbColor, factor: number): RgbColor {
  return interpolateRgbColor(color, target, factor);
}

function rgbColorToCssValue(color: RgbColor) {
  return `rgb(${color[0]} ${color[1]} ${color[2]})`;
}

function getScoreBaseColor(score: number): RgbColor {
  const normalizedScore = clampScore(score);

  if (normalizedScore <= 0.5) {
    return interpolateRgbColor(
      SCORE_COLOR_STOPS.success.light,
      SCORE_COLOR_STOPS.warning.light,
      normalizedScore / 0.5,
    );
  }

  return interpolateRgbColor(
    SCORE_COLOR_STOPS.warning.light,
    SCORE_COLOR_STOPS.error.light,
    (normalizedScore - 0.5) / 0.5,
  );
}

function getScoreCellStyle(score: number): CSSProperties {
  if (!Number.isFinite(score)) {
    return NEUTRAL_SCORE_CELL_STYLE;
  }

  const baseColor = getScoreBaseColor(score);
  const gradientStartColor = mixRgbColor(baseColor, [255, 255, 255], 0.26);
  const gradientEndColor = mixRgbColor(baseColor, [0, 0, 0], 0.04);

  return {
    "--score-cell-background-end": rgbColorToCssValue(gradientEndColor),
    "--score-cell-background-start": rgbColorToCssValue(gradientStartColor),
  } as CSSProperties;
}

function renderScoreCell(score: number) {
  return (
    <span className={styles["score-cell"]} style={getScoreCellStyle(score)}>
      {score}
    </span>
  );
}

function applyUsernameFilter(
  nextUsername: string,
  setFilters: Dispatch<SetStateAction<CommentsTableFilters>>,
  setDebouncedFilters: Dispatch<SetStateAction<CommentsTableFilters>>,
) {
  setFilters((current) => ({ ...current, username: nextUsername }));
  setDebouncedFilters((current) => ({ ...current, username: nextUsername }));
}

function isValidExternalUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildYoutubeVideoHref(contentId: string) {
  const normalizedContentId = contentId.trim();

  if (!normalizedContentId) {
    return null;
  }

  return `https://www.youtube.com/watch?v=${encodeURIComponent(normalizedContentId)}`;
}

function buildYoutubeCommentHref(contentId: string, commentId: string) {
  const normalizedContentId = contentId.trim();
  const normalizedCommentId = commentId.trim();

  if (!normalizedContentId || !normalizedCommentId) {
    return null;
  }

  return `https://www.youtube.com/watch?v=${encodeURIComponent(normalizedContentId)}&lc=${encodeURIComponent(normalizedCommentId)}`;
}

function buildYoutubeThumbnailSrc(contentId: string) {
  const normalizedContentId = contentId.trim();

  if (!normalizedContentId) {
    return null;
  }

  return `https://i.ytimg.com/vi/${encodeURIComponent(normalizedContentId)}/hqdefault.jpg`;
}

function toCommentsTableSort(sort: UiDataTableSort): CommentsTableSort {
  if (!sort || !SORT_FIELDS.has(sort.field as CommentsTableSortField)) {
    return null;
  }

  return {
    direction: sort.direction,
    field: sort.field as CommentsTableSortField,
  };
}

function toApiFilters(filters: CommentsTableFilters): CommentsTableFilters {
  return {
    callToActionFrom: filters.callToActionFrom,
    callToActionTo: filters.callToActionTo,
    comment: filters.comment,
    likesFrom: filters.likesFrom,
    likesTo: filters.likesTo,
    threatFrom: filters.threatFrom,
    threatTo: filters.threatTo,
    toxicFrom: filters.toxicFrom,
    toxicTo: filters.toxicTo,
    username: filters.username,
  };
}

function isCommentsTableResult(value: unknown): value is CommentsTableResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<CommentsTableResult>;

  return (
    Array.isArray(result.rows) &&
    typeof result.total === "number" &&
    typeof result.pageIndex === "number" &&
    typeof result.pageSize === "number" &&
    result.rows.every(
      (row) =>
        row &&
        typeof row === "object" &&
        typeof (row as Partial<CommentsTableRow>).id === "string" &&
        typeof (row as Partial<CommentsTableRow>).comment === "string" &&
        typeof (row as Partial<CommentsTableRow>).comment_id === "string" &&
        typeof (row as Partial<CommentsTableRow>).content_id === "string" &&
        typeof (row as Partial<CommentsTableRow>).username === "string" &&
        typeof (row as Partial<CommentsTableRow>).publishedat === "number" &&
        typeof (row as Partial<CommentsTableRow>).likes === "number" &&
        typeof (row as Partial<CommentsTableRow>).source === "string" &&
        typeof (row as Partial<CommentsTableRow>).toxic === "number" &&
        typeof (row as Partial<CommentsTableRow>).threat === "number" &&
        typeof (row as Partial<CommentsTableRow>).call_to_action === "number",
    )
  );
}

export function CommentsPageTable({
  hasLoadedStoredPosts,
  searchFrom,
  searchQuery,
  searchTo,
  searchTrigger,
  selectedPosts,
}: CommentsPageTableProps) {
  const locale = useLocale();
  const t = useTranslations();
  const [state, setState] = useState<TableState>({ status: "loading" });
  const [lastSuccessfulData, setLastSuccessfulData] = useState<CommentsTableResult | null>(null);
  const [filters, setFilters] = useState<CommentsTableFilters>(DEFAULT_COMMENTS_TABLE_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<CommentsTableFilters>(DEFAULT_COMMENTS_TABLE_FILTERS);
  const [sort, setSort] = useState<UiDataTableSort>(null);
  const [pageState, setPageState] = useState<PageState>({
    pageIndex: 0,
    querySignature: "",
  });
  const [pageSize, setPageSize] = useState<CommentsTablePageSize>(DEFAULT_COMMENTS_TABLE_PAGE_SIZE);
  const selectedPostsRef = useRef(selectedPosts);
  const apiFilters = useMemo(() => toApiFilters(debouncedFilters), [debouncedFilters]);
  const sortSignature = sort ? `${sort.field}:${sort.direction}` : "";
  const selectedPostsSignature = useMemo(() => selectedPosts.join("\u0000"), [selectedPosts]);
  const querySignature = useMemo(
    () =>
      JSON.stringify({
        filters: apiFilters,
        pageSize,
        searchFrom,
        searchQuery,
        searchTo,
        searchTrigger,
        selectedPostsSignature,
        sort: sortSignature,
      }),
    [apiFilters, pageSize, searchFrom, searchQuery, searchTo, searchTrigger, selectedPostsSignature, sortSignature],
  );
  const pageIndex = pageState.querySignature === querySignature ? pageState.pageIndex : 0;
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
    selectedPostsRef.current = selectedPosts;
  }, [selectedPosts]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedFilters(filters);
    }, FILTER_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [filters]);

  useEffect(() => {
    if (!hasLoadedStoredPosts) {
      return;
    }

    const abortController = new AbortController();

    async function loadTable() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/comments/table", {
          body: JSON.stringify({
            from: searchFrom,
            pageIndex,
            pageSize,
            posts: selectedPostsRef.current,
            query: searchQuery,
            sort: toCommentsTableSort(sort),
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

        if (!isCommentsTableResult(payload)) {
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
  }, [apiFilters, hasLoadedStoredPosts, pageIndex, pageSize, querySignature, searchFrom, searchQuery, searchTo, sort]);

  const visibleData = state.status === "success" ? state.data : lastSuccessfulData;
  const rows = visibleData?.rows ?? [];
  const total = visibleData?.total ?? 0;
  const columns = useMemo<Array<DataTableColumn<CommentsTableRow>>>(
    () => [
      {
        cell: (row) => {
          if (row.source !== "youtube") {
            return isValidExternalUrl(row.content_id) ? (
              <a className={styles["publication-link"]} href={row.content_id} rel="noreferrer" target="_blank">
                {row.content_id}
              </a>
            ) : (
              <span className={styles["cell-text"]}>{row.content_id}</span>
            );
          }

          const href = buildYoutubeVideoHref(row.content_id);
          const thumbnailSrc = buildYoutubeThumbnailSrc(row.content_id);

          if (!href || !thumbnailSrc) {
            return <span className={styles["cell-text"]}>{row.content_id}</span>;
          }

          return (
            <a
              aria-label={t("comments.table.youtube-thumbnail-link", { contentId: row.content_id })}
              className={styles["publication-thumbnail-link"]}
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt={t("comments.table.youtube-thumbnail-alt", { contentId: row.content_id })}
                className={styles["publication-thumbnail-image"]}
                height={90}
                loading="lazy"
                src={thumbnailSrc}
                unoptimized
                width={160}
              />
            </a>
          );
        },
        enableSorting: true,
        header: t("comments.table.publication"),
        id: "content_id",
        minSize: 100,
        size: 150,
      },
      {
        cell: (row) => {
          const youtubeCommentHref =
            row.source === "youtube" ? buildYoutubeCommentHref(row.content_id, row.comment_id) : null;
          const comment = row.comment.length > MAX_COMMENT_LENGTH
            ? row.comment.slice(0, MAX_COMMENT_LENGTH) + '…'
            : row.comment;

          return (
            <div className={styles["comment-cell"]}>
              {youtubeCommentHref ? (
                <a
                  className={styles["publication-link"]}
                  href={youtubeCommentHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  {comment}
                </a>
              ) : (
                <span className={styles["cell-text"]}>{row.comment}</span>
              )}
              <span className={styles["comment-date"]}>
                {dateFormatter.format(new Date(row.publishedat * 1000))}
              </span>
            </div>
          );
        },
        filterRenderer: (
          <input
            className={styles["filter-input"]}
            name="sunqar-comments-table-comment"
            placeholder={t("comments.table.comment-filter-placeholder")}
            type="search"
            value={filters.comment}
            onChange={(event) => {
              setFilters((current) => ({ ...current, comment: event.target.value }));
            }}
          />
        ),
        header: t("comments.table.comment"),
        id: "comment",
        isFilterActive: filters.comment.trim().length > 0,
        minSize: 250,
        size: 430,
      },
      {
        cell: (row) => {
          const normalizedUsername = row.username.trim();
          const normalizedFilterUsername = filters.username.trim();
          const isUsernameFilterAppliedToRow =
            normalizedUsername.length > 0 && normalizedFilterUsername === normalizedUsername;

          return (
            <div className={styles["username-cell"]}>
              <span className={styles["username-text"]}>{row.username}</span>
              {normalizedUsername ? (
                <button
                  aria-label={
                    isUsernameFilterAppliedToRow
                      ? t("comments.table.clear-username-filter", { username: row.username })
                      : t("comments.table.apply-username-filter", { username: row.username })
                  }
                  className={[
                    styles["username-filter-button"],
                    isUsernameFilterAppliedToRow ? styles["username-filter-button-active"] : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  onClick={() => {
                    applyUsernameFilter(
                      isUsernameFilterAppliedToRow ? "" : row.username,
                      setFilters,
                      setDebouncedFilters,
                    );
                  }}
                >
                  {isUsernameFilterAppliedToRow ? (
                    <FunnelXIcon className={styles["username-filter-button-icon"]} />
                  ) : (
                    <FunnelPlusIcon className={styles["username-filter-button-icon"]} />
                  )}
                </button>
              ) : null}
            </div>
          );
        },
        enableSorting: true,
        filterRenderer: (
          <input
            className={styles["filter-input"]}
            name="sunqar-comments-table-username"
            placeholder={t("comments.table.username-filter-placeholder")}
            type="search"
            value={filters.username}
            onChange={(event) => {
              setFilters((current) => ({ ...current, username: event.target.value }));
            }}
          />
        ),
        header: t("comments.table.username"),
        id: "username",
        isFilterActive: filters.username.trim().length > 0,
        minSize: 120,
        size: 160,
      },
      {
        cell: (row) => <span className={`${styles["cell-text"]} ${styles["likes-cell"]}`}>{row.likes}</span>,
        enableSorting: true,
        filterRenderer: (
          <div className={styles["range-filter-grid"]}>
            <input
              className={styles["filter-input"]}
              name="sunqar-comments-table-likes-from"
              placeholder={t("comments.table.number-from-filter-placeholder")}
              step="any"
              type="number"
              value={filters.likesFrom}
              onChange={(event) => {
                setFilters((current) => ({ ...current, likesFrom: event.target.value }));
              }}
            />
            <input
              className={styles["filter-input"]}
              name="sunqar-comments-table-likes-to"
              placeholder={t("comments.table.number-to-filter-placeholder")}
              step="any"
              type="number"
              value={filters.likesTo}
              onChange={(event) => {
                setFilters((current) => ({ ...current, likesTo: event.target.value }));
              }}
            />
          </div>
        ),
        header: t("comments.table.likes"),
        id: "likes",
        isFilterActive: filters.likesFrom.trim().length > 0 || filters.likesTo.trim().length > 0,
        minSize: 80,
        size: 100,
      },
      {
        cell: (row) => renderScoreCell(row.toxic),
        enableSorting: true,
        filterRenderer: (
          <div className={styles["range-filter-grid"]}>
            <input
              className={styles["filter-input"]}
              name="sunqar-comments-table-toxic-from"
              placeholder={t("comments.table.number-from-filter-placeholder")}
              step="any"
              type="number"
              value={filters.toxicFrom}
              onChange={(event) => {
                setFilters((current) => ({ ...current, toxicFrom: event.target.value }));
              }}
            />
            <input
              className={styles["filter-input"]}
              name="sunqar-comments-table-toxic-to"
              placeholder={t("comments.table.number-to-filter-placeholder")}
              step="any"
              type="number"
              value={filters.toxicTo}
              onChange={(event) => {
                setFilters((current) => ({ ...current, toxicTo: event.target.value }));
              }}
            />
          </div>
        ),
        header: t("comments.table.toxic"),
        id: "toxic",
        isFilterActive: filters.toxicFrom.trim().length > 0 || filters.toxicTo.trim().length > 0,
        minSize: 80,
        size: 120,
      },
      {
        cell: (row) => renderScoreCell(row.threat),
        enableSorting: true,
        filterRenderer: (
          <div className={styles["range-filter-grid"]}>
            <input
              className={styles["filter-input"]}
              name="sunqar-comments-table-threat-from"
              placeholder={t("comments.table.number-from-filter-placeholder")}
              step="any"
              type="number"
              value={filters.threatFrom}
              onChange={(event) => {
                setFilters((current) => ({ ...current, threatFrom: event.target.value }));
              }}
            />
            <input
              className={styles["filter-input"]}
              name="sunqar-comments-table-threat-to"
              placeholder={t("comments.table.number-to-filter-placeholder")}
              step="any"
              type="number"
              value={filters.threatTo}
              onChange={(event) => {
                setFilters((current) => ({ ...current, threatTo: event.target.value }));
              }}
            />
          </div>
        ),
        header: t("comments.table.threat"),
        id: "threat",
        isFilterActive: filters.threatFrom.trim().length > 0 || filters.threatTo.trim().length > 0,
        minSize: 80,
        size: 120,
      },
      {
        cell: (row) => renderScoreCell(row.call_to_action),
        enableSorting: true,
        filterRenderer: (
          <div className={styles["range-filter-grid"]}>
            <input
              className={styles["filter-input"]}
              name="sunqar-comments-table-call-to-action-from"
              placeholder={t("comments.table.number-from-filter-placeholder")}
              step="any"
              type="number"
              value={filters.callToActionFrom}
              onChange={(event) => {
                setFilters((current) => ({ ...current, callToActionFrom: event.target.value }));
              }}
            />
            <input
              className={styles["filter-input"]}
              name="sunqar-comments-table-call-to-action-to"
              placeholder={t("comments.table.number-to-filter-placeholder")}
              step="any"
              type="number"
              value={filters.callToActionTo}
              onChange={(event) => {
                setFilters((current) => ({ ...current, callToActionTo: event.target.value }));
              }}
            />
          </div>
        ),
        header: t("comments.table.call-to-action"),
        id: "call_to_action",
        isFilterActive:
          filters.callToActionFrom.trim().length > 0 || filters.callToActionTo.trim().length > 0,
        minSize: 80,
        size: 120,
      },
    ],
    [dateFormatter, filters, t],
  );

  return (
    <section className={styles["comments-page-table"]}>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        labels={{
          empty: t("comments.table.empty"),
          error: t("comments.table.error"),
          filterColumn: t("comments.table.filter-column"),
          firstPage: t("comments.table.first-page"),
          lastPage: t("comments.table.last-page"),
          loading: t("comments.table.loading"),
          nextPage: t("comments.table.next-page"),
          page: (currentPage, totalPages) =>
            t("comments.table.page", {
              currentPage,
              totalPages,
            }),
          pageSize: t("comments.table.page-size"),
          previousPage: t("comments.table.previous-page"),
          resizeColumn: t("comments.table.resize-column"),
          selectedRows: (count) => t("comments.table.selected-rows", { count }),
          sortAscending: t("comments.table.sort-ascending"),
          sortCleared: t("comments.table.sort-cleared"),
          sortDescending: t("comments.table.sort-descending"),
        }}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageSizeOptions={COMMENTS_TABLE_PAGE_SIZES}
        selectionMode="none"
        sort={sort}
        status={state.status}
        storageKey={COMMENTS_TABLE_COLUMN_WIDTHS_STORAGE_KEY}
        total={total}
        onPageChange={(nextPageIndex) => {
          setPageState({
            pageIndex: nextPageIndex,
            querySignature,
          });
        }}
        onPageSizeChange={(nextPageSize) => {
          if (COMMENTS_TABLE_PAGE_SIZES.some((availablePageSize) => availablePageSize === nextPageSize)) {
            setPageSize(nextPageSize as CommentsTablePageSize);
          }
        }}
        onSortChange={setSort}
      />
    </section>
  );
}
