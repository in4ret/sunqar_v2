import { redirect } from "next/navigation";

import { getCommentsPostOptions } from "@/lib/comments";
import type { CommentsTab } from "@/lib/routes";
import { getCommentsTabRoute } from "@/lib/routes";
import {
  formatEpochSecondsToDateTimeLocalValue,
  normalizeEpochSecondsParam,
  normalizeSearchQueryParam,
} from "@/lib/utils";

import { CommentsPageView } from "../comments-page-view/comments-page-view";

type CommentsPageParams = Promise<{
  tab: string;
}>;

type CommentsPageSearchParams = Promise<{
  from?: string | string[];
  q?: string | string[];
  to?: string | string[];
}>;

const COMMENTS_TABS = new Set<CommentsTab>(["chart", "text", "upload"]);

function isCommentsTab(value: string): value is CommentsTab {
  return COMMENTS_TABS.has(value as CommentsTab);
}

function buildCommentsChartRedirectUrl(input: {
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
}) {
  const nextUrl = new URL(getCommentsTabRoute("chart"), "http://sunqar.local");

  if (input.searchFrom) {
    nextUrl.searchParams.set("from", input.searchFrom);
  }

  if (input.searchQuery) {
    nextUrl.searchParams.set("q", input.searchQuery);
  }

  if (input.searchTo) {
    nextUrl.searchParams.set("to", input.searchTo);
  }

  return `${nextUrl.pathname}${nextUrl.search}`;
}

export default async function CommentsTabPage({
  params,
  searchParams,
}: {
  params: CommentsPageParams;
  searchParams: CommentsPageSearchParams;
}) {
  const [{ tab }, { from, q, to }, commentsPostOptions] = await Promise.all([
    params,
    searchParams,
    getCommentsPostOptions(),
  ]);
  const searchFrom = normalizeEpochSecondsParam(from);
  const searchQuery = normalizeSearchQueryParam(q);
  const searchTo = normalizeEpochSecondsParam(to);

  if (!isCommentsTab(tab)) {
    redirect(buildCommentsChartRedirectUrl({ searchFrom, searchQuery, searchTo }));
  }

  return (
    <CommentsPageView
      activeTab={tab}
      availablePostValues={commentsPostOptions.availablePostValues}
      displaySearchFrom={formatEpochSecondsToDateTimeLocalValue(searchFrom)}
      displaySearchTo={formatEpochSecondsToDateTimeLocalValue(searchTo)}
      postOptions={commentsPostOptions.postOptions}
      searchFrom={searchFrom}
      searchQuery={searchQuery}
      searchTo={searchTo}
    />
  );
}
