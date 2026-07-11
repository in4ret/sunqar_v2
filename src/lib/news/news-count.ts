import "server-only";

import { unstable_cache } from "next/cache";

import { ONE_HOUR_REVALIDATE } from "@/lib/cache";
import { manticoreSql } from "@/lib/manticore";
import {
  buildNewsWhereClause,
  type NewsQueryInput,
  type NormalizedNewsQueryInput,
  normalizeNewsQueryInput,
  resolveNewsAggregateExecutionMode,
} from "@/lib/news/news-filters";

type CountRow = {
  total: number | string;
};

async function getNewsCount(input: NormalizedNewsQueryInput) {
  const rows = await manticoreSql<CountRow>(
    `SELECT COUNT(*) AS total FROM news${buildNewsWhereClause(input.query, input.sources, input.from, input.to)}`,
  );

  return Number(rows[0]?.total ?? 0);
}

export function resolveNewsCountExecutionMode(input: Pick<NormalizedNewsQueryInput, "to">) {
  return resolveNewsAggregateExecutionMode(input);
}

const getCachedNewsCount = unstable_cache(
  async (query: string, serializedSources: string, from: string, to: string) =>
    getNewsCount({
      aggregation: "sources",
      from,
      query,
      sources: serializedSources ? serializedSources.split("\u0000") : [],
      to,
    }),
  ["news-count-v1"],
  {
    revalidate: ONE_HOUR_REVALIDATE,
    tags: ["news:count"],
  }
);

export async function countNews(input: NewsQueryInput) {
  const normalizedInput = normalizeNewsQueryInput(input);

  if (resolveNewsCountExecutionMode(normalizedInput) === "direct") {
    return getNewsCount(normalizedInput);
  }

  return getCachedNewsCount(
    normalizedInput.query,
    normalizedInput.sources.join("\u0000"),
    normalizedInput.from,
    normalizedInput.to,
  );
}
