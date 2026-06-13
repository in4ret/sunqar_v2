import { listSources } from "@/lib/sources/sources";
import {
  formatEpochSecondsToDateTimeLocalValue,
  normalizeEpochSecondsParam,
  normalizeSearchQueryParam,
} from "@/lib/utils";

import { NewsPageView } from "./news-page-view/news-page-view";

type NewsPageSearchParams = Promise<{
  from?: string | string[];
  q?: string | string[];
  to?: string | string[];
}>;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: NewsPageSearchParams;
}) {
  const { from, q, to } = await searchParams;
  const sources = await listSources();
  const searchFrom = normalizeEpochSecondsParam(from);
  const searchQuery = normalizeSearchQueryParam(q);
  const searchTo = normalizeEpochSecondsParam(to);

  return (
    <NewsPageView
      displaySearchFrom={formatEpochSecondsToDateTimeLocalValue(searchFrom)}
      displaySearchTo={formatEpochSecondsToDateTimeLocalValue(searchTo)}
      searchFrom={searchFrom}
      searchQuery={searchQuery}
      searchTo={searchTo}
      sources={sources}
    />
  );
}
