"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import {
  type CommentsRelatedTableFilters,
  type CommentsRelatedTableResult,
  type CommentsRelatedTableRow,
  type CommentsRelatedTableSort,
  type CommentsRelatedTableSortField,
  DEFAULT_COMMENTS_RELATED_TABLE_FILTERS,
} from "@/lib/comments/comments-related-table.types";
import {
  COMMENTS_TABLE_PAGE_SIZES,
  type CommentsTablePageSize,
  DEFAULT_COMMENTS_TABLE_PAGE_SIZE,
} from "@/lib/comments/comments-table.types";
import { DataTable, type DataTableColumn, type DataTableSort } from "@/ui";
import { FunnelPlusIcon, FunnelXIcon } from "@/ui/icon/icon";

import styles from "./comments-page-related-table.module.scss";

type CommentsPageRelatedTableProps = {
  activeCommentId: string;
};

type TableState =
  | {
      status: "loading";
    }
  | {
      status: "error";
    }
  | {
      data: CommentsRelatedTableResult;
      status: "success";
    };

type PageState = {
  commentId: string;
  pageIndex: number;
};

const COMMENTS_RELATED_TABLE_COLUMN_WIDTHS_STORAGE_KEY = "sunqar-comments-related-table-column-widths";
const FILTER_DEBOUNCE_MS = 350;
const MAX_COMMENT_LENGTH = 500;
const SORT_FIELDS = new Set<CommentsRelatedTableSortField>([
  "content_id",
  "likes",
  "publishedat",
  "similarity",
  "username",
]);
const DEFAULT_SORT: DataTableSort = {
  direction: "asc",
  field: "similarity",
};

function applyUsernameFilter(
  nextUsername: string,
  setFilters: Dispatch<SetStateAction<CommentsRelatedTableFilters>>,
  setDebouncedFilters: Dispatch<SetStateAction<CommentsRelatedTableFilters>>,
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

function toCommentsRelatedTableSort(sort: DataTableSort): CommentsRelatedTableSort {
  if (!sort || !SORT_FIELDS.has(sort.field as CommentsRelatedTableSortField)) {
    return null;
  }

  return {
    direction: sort.direction,
    field: sort.field as CommentsRelatedTableSortField,
  };
}

function isCommentsRelatedTableResult(value: unknown): value is CommentsRelatedTableResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<CommentsRelatedTableResult>;

  return (
    Array.isArray(result.rows) &&
    typeof result.total === "number" &&
    typeof result.pageIndex === "number" &&
    typeof result.pageSize === "number" &&
    result.rows.every(
      (row) =>
        row &&
        typeof row === "object" &&
        typeof (row as Partial<CommentsRelatedTableRow>).id === "string" &&
        typeof (row as Partial<CommentsRelatedTableRow>).comment === "string" &&
        typeof (row as Partial<CommentsRelatedTableRow>).comment_id === "string" &&
        typeof (row as Partial<CommentsRelatedTableRow>).content_id === "string" &&
        typeof (row as Partial<CommentsRelatedTableRow>).username === "string" &&
        typeof (row as Partial<CommentsRelatedTableRow>).publishedat === "number" &&
        typeof (row as Partial<CommentsRelatedTableRow>).likes === "number" &&
        typeof (row as Partial<CommentsRelatedTableRow>).source === "string" &&
        typeof (row as Partial<CommentsRelatedTableRow>).toxic === "number" &&
        typeof (row as Partial<CommentsRelatedTableRow>).threat === "number" &&
        typeof (row as Partial<CommentsRelatedTableRow>).call_to_action === "number" &&
        typeof (row as Partial<CommentsRelatedTableRow>).similarity === "number",
    )
  );
}

export function CommentsPageRelatedTable({ activeCommentId }: CommentsPageRelatedTableProps) {
  const locale = useLocale();
  const t = useTranslations();
  const [state, setState] = useState<TableState>({ status: "loading" });
  const [lastSuccessfulData, setLastSuccessfulData] = useState<CommentsRelatedTableResult | null>(null);
  const [filters, setFilters] = useState<CommentsRelatedTableFilters>(DEFAULT_COMMENTS_RELATED_TABLE_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<CommentsRelatedTableFilters>(
    DEFAULT_COMMENTS_RELATED_TABLE_FILTERS,
  );
  const [sort, setSort] = useState<DataTableSort>(DEFAULT_SORT);
  const [pageState, setPageState] = useState<PageState>({
    commentId: activeCommentId,
    pageIndex: 0,
  });
  const [pageSize, setPageSize] = useState<CommentsTablePageSize>(DEFAULT_COMMENTS_TABLE_PAGE_SIZE);
  const pageIndex = pageState.commentId === activeCommentId ? pageState.pageIndex : 0;
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
    const abortController = new AbortController();

    async function loadTable() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/comments/related-table", {
          body: JSON.stringify({
            commentId: activeCommentId,
            pageIndex,
            pageSize,
            sort: toCommentsRelatedTableSort(sort),
            tableFilters: debouncedFilters,
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

        if (!isCommentsRelatedTableResult(payload)) {
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
  }, [activeCommentId, debouncedFilters, pageIndex, pageSize, sort]);

  const visibleData = state.status === "success" ? state.data : lastSuccessfulData;
  const rows = visibleData?.rows ?? [];
  const total = visibleData?.total ?? 0;

  const resetTableNavigation = useCallback(() => {
    setPageState({
      commentId: activeCommentId,
      pageIndex: 0,
    });
  }, [activeCommentId]);

  const columns = useMemo<Array<DataTableColumn<CommentsRelatedTableRow>>>(
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
        size: 130,
      },
      {
        cell: (row) => {
          const youtubeCommentHref =
            row.source === "youtube" ? buildYoutubeCommentHref(row.content_id, row.comment_id) : null;
          const comment =
            row.comment.length > MAX_COMMENT_LENGTH ? `${row.comment.slice(0, MAX_COMMENT_LENGTH)}…` : row.comment;

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
            name="sunqar-comments-related-table-comment"
            placeholder={t("comments.table.comment-filter-placeholder")}
            type="search"
            value={filters.comment}
            onChange={(event) => {
              resetTableNavigation();
              setFilters((current) => ({ ...current, comment: event.target.value }));
            }}
          />
        ),
        header: t("comments.table.comment"),
        id: "comment",
        isFilterActive: filters.comment.trim().length > 0,
        minSize: 250,
        size: 350,
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
                    resetTableNavigation();
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
            name="sunqar-comments-related-table-username"
            placeholder={t("comments.table.username-filter-placeholder")}
            type="search"
            value={filters.username}
            onChange={(event) => {
              resetTableNavigation();
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
              name="sunqar-comments-related-table-likes-from"
              placeholder={t("comments.table.number-from-filter-placeholder")}
              step="any"
              type="number"
              value={filters.likesFrom}
              onChange={(event) => {
                resetTableNavigation();
                setFilters((current) => ({ ...current, likesFrom: event.target.value }));
              }}
            />
            <input
              className={styles["filter-input"]}
              name="sunqar-comments-related-table-likes-to"
              placeholder={t("comments.table.number-to-filter-placeholder")}
              step="any"
              type="number"
              value={filters.likesTo}
              onChange={(event) => {
                resetTableNavigation();
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
        cell: (row) => <span className={styles["cell-text"]}>{String(row.similarity)}</span>,
        enableSorting: true,
        filterRenderer: (
          <div className={styles["range-filter-grid"]}>
            <input
              className={styles["filter-input"]}
              name="sunqar-comments-related-table-similarity-from"
              placeholder={t("comments.related-table.similarity-from-filter-placeholder")}
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
              name="sunqar-comments-related-table-similarity-to"
              placeholder={t("comments.related-table.similarity-to-filter-placeholder")}
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
        header: t("comments.related-table.similarity"),
        id: "similarity",
        isFilterActive:
          filters.similarityFrom.trim().length > 0 || filters.similarityTo.trim().length > 0,
        minSize: 100,
        size: 120,
      },
    ],
    [dateFormatter, filters, resetTableNavigation, t],
  );

  return (
    <section className={styles["comments-page-related-table"]}>
      <div className={styles["comments-page-related-table-scroll"]}>
        <div className={styles["comments-page-related-table-content"]}>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            labels={{
              empty: t("comments.related-table.empty"),
              error: t("comments.related-table.error"),
              filterColumn: t("comments.table.filter-column"),
              firstPage: t("comments.table.first-page"),
              lastPage: t("comments.table.last-page"),
              loading: t("comments.related-table.loading"),
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
            storageKey={COMMENTS_RELATED_TABLE_COLUMN_WIDTHS_STORAGE_KEY}
            stickyHeaderWithScrollableRows
            total={total}
            onPageChange={(nextPageIndex) => {
              setPageState({
                commentId: activeCommentId,
                pageIndex: nextPageIndex,
              });
            }}
            onPageSizeChange={(nextPageSize) => {
              if (COMMENTS_TABLE_PAGE_SIZES.some((availablePageSize) => availablePageSize === nextPageSize)) {
                setPageSize(nextPageSize as CommentsTablePageSize);
              }
            }}
            onSortChange={setSort}
          />
        </div>
      </div>
    </section>
  );
}
