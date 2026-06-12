import { listSources } from "@/lib/sources/sources";
import { normalizeDateTimeLocalParam, normalizeSearchQueryParam } from "@/lib/utils";

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
  const searchFrom = normalizeDateTimeLocalParam(from);
  const searchQuery = normalizeSearchQueryParam(q);
  const searchTo = normalizeDateTimeLocalParam(to);

  return (
    <NewsPageView
      searchFrom={searchFrom}
      searchQuery={searchQuery}
      searchTo={searchTo}
      sources={sources}
    />
  );
}
