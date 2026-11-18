"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { SemanticSearchArticle } from "@/lib/semantic/semantic-search.types";
import { DataTable, type DataTableColumn, ScoreCell } from "@/ui";

import styles from "./semantic-search-table.module.scss";

type ArticleRow = SemanticSearchArticle & { rowId: string };
const PAGE_SIZES = [10, 25, 50, 100] as const;

export function SemanticSearchTable({ articles }: { articles: SemanticSearchArticle[] }) {
  const t = useTranslations();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(25);
  // Gateway IDs can exceed JavaScript's safe integer range; use response position and URL instead.
  const rows = articles.map((article, index) => ({ ...article, rowId: `${index}:${article.url}` }));
  const columns: DataTableColumn<ArticleRow>[] = [
    {
      id: "article",
      header: t("semantic.table.article"),
      size: 650,
      minSize: 240,
      enableSorting: false,
      cell: (row) => (
        <a className={styles["article-link"]} href={row.url} target="_blank" rel="noopener noreferrer">
          {row.title}
        </a>
      ),
    },
    {
      id: "source",
      header: t("semantic.table.source"),
      size: 200,
      minSize: 160,
      enableSorting: false,
      cell: (row) => row.source,
    },
    {
      id: "distance",
      header: t("semantic.table.distance"),
      size: 160,
      minSize: 140,
      enableSorting: false,
      cell: (row) => <ScoreCell value={row.dist} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
      getRowId={(row) => row.rowId}
      labels={{
        empty: t("semantic.table.empty"),
        error: t("semantic.error"),
        firstPage: t("news.table.first-page"),
        filterColumn: t("news.table.filter-column"),
        lastPage: t("news.table.last-page"),
        loading: t("semantic.loading"),
        nextPage: t("news.table.next-page"),
        page: (currentPage, totalPages) => t("news.table.page", { currentPage, totalPages }),
        pageSize: t("news.table.page-size"),
        previousPage: t("news.table.previous-page"),
        resizeColumn: t("news.table.resize-column"),
        sortAscending: t("news.table.sort-ascending"),
        sortCleared: t("news.table.sort-cleared"),
        sortDescending: t("news.table.sort-descending"),
        selectedRows: (count) => t("news.table.selected-rows", { count }),
      }}
      onPageChange={setPageIndex}
      onPageSizeChange={(size) => { setPageSize(size); setPageIndex(0); }}
      onSortChange={() => {}}
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZES}
      selectionMode="none"
      sort={null}
      status="success"
      storageKey="sunqar-semantic-table-column-widths"
      total={articles.length}
    />
  );
}
