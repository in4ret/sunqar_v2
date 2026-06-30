import { getCommentsPostOptions } from "@/lib/comments";
import {
  formatEpochSecondsToDateTimeLocalValue,
  normalizeEpochSecondsParam,
  normalizeSearchQueryParam,
} from "@/lib/utils";

import { CommentsPageView } from "./comments-page-view/comments-page-view";

type CommentsPageSearchParams = Promise<{
  from?: string | string[];
  q?: string | string[];
  to?: string | string[];
}>;

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: CommentsPageSearchParams;
}) {
  const [{ from, q, to }, commentsPostOptions] = await Promise.all([
    searchParams,
    getCommentsPostOptions(),
  ]);
  const searchFrom = normalizeEpochSecondsParam(from);
  const searchQuery = normalizeSearchQueryParam(q);
  const searchTo = normalizeEpochSecondsParam(to);

  return (
    <CommentsPageView
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
