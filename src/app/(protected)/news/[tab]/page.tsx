import { redirect } from "next/navigation";

import { listAiModels } from "@/lib/ai-models/ai-models";
import { getNewsTabRoute, type NewsTab } from "@/lib/routes";
import { listSources } from "@/lib/sources/sources";
import {
  normalizeEpochSecondsParam,
  normalizeSearchQueryParam,
} from "@/lib/utils";

import { NewsPageView } from "../news-page-view/news-page-view";

type NewsPageParams = Promise<{
  tab: string;
}>;

type NewsPageSearchParams = Promise<{
  from?: string | string[];
  q?: string | string[];
  to?: string | string[];
}>;

const NEWS_TABS = new Set<NewsTab>(["chart", "text"]);

function isNewsTab(value: string): value is NewsTab {
  return NEWS_TABS.has(value as NewsTab);
}

function buildNewsChartRedirectUrl(input: {
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
}) {
  const nextUrl = new URL(getNewsTabRoute("chart"), "http://sunqar.local");

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

export default async function NewsTabPage({
  params,
  searchParams,
}: {
  params: NewsPageParams;
  searchParams: NewsPageSearchParams;
}) {
  const [{ tab }, { from, q, to }] = await Promise.all([params, searchParams]);
  const searchFrom = normalizeEpochSecondsParam(from);
  const searchQuery = normalizeSearchQueryParam(q);
  const searchTo = normalizeEpochSecondsParam(to);

  if (!isNewsTab(tab)) {
    redirect(buildNewsChartRedirectUrl({ searchFrom, searchQuery, searchTo }));
  }

  const [aiModels, sources] = await Promise.all([listAiModels(), listSources()]);
  const activeAiModels = aiModels
    .filter((aiModel) => aiModel.isActive)
    .map((aiModel) => ({
      label: aiModel.displayName,
      value: aiModel.modelId,
    }));

  return (
    <NewsPageView
      activeTab={tab}
      aiModels={activeAiModels}
      searchFrom={searchFrom}
      searchQuery={searchQuery}
      searchTo={searchTo}
      sources={sources}
    />
  );
}
