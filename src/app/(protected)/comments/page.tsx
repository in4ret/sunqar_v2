import { listPosts } from "@/lib/posts/posts";
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
  const [{ from, q, to }, posts] = await Promise.all([searchParams, listPosts()]);
  const searchFrom = normalizeEpochSecondsParam(from);
  const searchQuery = normalizeSearchQueryParam(q);
  const searchTo = normalizeEpochSecondsParam(to);

  return (
    <CommentsPageView
      displaySearchFrom={formatEpochSecondsToDateTimeLocalValue(searchFrom)}
      displaySearchTo={formatEpochSecondsToDateTimeLocalValue(searchTo)}
      posts={posts}
      searchFrom={searchFrom}
      searchQuery={searchQuery}
      searchTo={searchTo}
    />
  );
}
