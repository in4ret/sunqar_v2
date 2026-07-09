import { redirect } from "next/navigation";

import { listAiModels } from "@/lib/ai-models/ai-models";
import { getCommentsPostOptions } from "@/lib/comments";
import {
  mapYoutubeContentIdsToCommentPostFilterValues,
  normalizeCommentsTaskContentIdsParam,
} from "@/lib/comments/comments-filters";
import type { CommentsTab } from "@/lib/routes";
import { getCommentsTabRoute } from "@/lib/routes";
import {
  normalizeEpochSecondsParam,
  normalizeSearchQueryParam,
} from "@/lib/utils";

import { CommentsPageView } from "../comments-page-view/comments-page-view";

type CommentsPageParams = Promise<{
  tab: string;
}>;

type CommentsPageSearchParams = Promise<{
  from?: string | string[];
  p?: string | string[];
  q?: string | string[];
  to?: string | string[];
}>;

const COMMENTS_TABS = new Set<CommentsTab>(["chart", "text", "upload"]);

function isCommentsTab(value: string): value is CommentsTab {
  return COMMENTS_TABS.has(value as CommentsTab);
}

function buildCommentsChartRedirectUrl(input: {
  searchFrom: string;
  taskContentIds: string[];
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

  if (input.taskContentIds.length > 0) {
    nextUrl.searchParams.set("p", input.taskContentIds.join(","));
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
  const [{ tab }, { from, p, q, to }, aiModels, commentsPostOptions] = await Promise.all([
    params,
    searchParams,
    listAiModels(),
    getCommentsPostOptions(),
  ]);
  const searchFrom = normalizeEpochSecondsParam(from);
  const taskContentIds = normalizeCommentsTaskContentIdsParam(p);
  const searchQuery = normalizeSearchQueryParam(q);
  const searchTo = normalizeEpochSecondsParam(to);
  const hasTaskContentIdsSearchParam = Array.isArray(p) ? typeof p[0] === "string" : typeof p === "string";
  const initialSelectedPostsFromUrl = mapYoutubeContentIdsToCommentPostFilterValues(
    taskContentIds,
    commentsPostOptions.availablePostValues,
  );
  const activeAiModels = aiModels
    .filter((aiModel) => aiModel.isActive)
    .map((aiModel) => ({
      label: aiModel.displayName,
      value: aiModel.modelId,
    }));

  if (!isCommentsTab(tab)) {
    redirect(buildCommentsChartRedirectUrl({ searchFrom, searchQuery, searchTo, taskContentIds }));
  }

  return (
    <CommentsPageView
      activeTab={tab}
      aiModels={activeAiModels}
      availablePostValues={commentsPostOptions.availablePostValues}
      hasTaskContentIdsSearchParam={hasTaskContentIdsSearchParam}
      initialSelectedPostsFromUrl={initialSelectedPostsFromUrl}
      postOptions={commentsPostOptions.postOptions}
      searchFrom={searchFrom}
      searchQuery={searchQuery}
      searchTo={searchTo}
      taskContentIds={taskContentIds}
    />
  );
}
