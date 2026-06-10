import { listSources } from "@/lib/sources/sources";
import { normalizeSearchQueryParam } from "@/lib/utils";

import { NewsPageView } from "./news-page-view/news-page-view";

type NewsPageSearchParams = Promise<{
  q?: string | string[];
}>;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: NewsPageSearchParams;
}) {
  const { q } = await searchParams;
  const sources = await listSources();
  const searchQuery = normalizeSearchQueryParam(q);

  return <NewsPageView searchQuery={searchQuery} sources={sources} />;
}
