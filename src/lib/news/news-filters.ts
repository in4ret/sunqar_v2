import "server-only";

import type { NewsChartAggregation } from "@/lib/news/news-chart-shared";
import { normalizeSearchQuery } from "@/lib/utils";

export type NewsQueryInput = {
  aggregation?: NewsChartAggregation;
  from: string;
  query: string;
  sources: string[];
  to: string;
};

export type NormalizedNewsQueryInput = {
  aggregation: NewsChartAggregation;
  from: string;
  query: string;
  sources: string[];
  to: string;
};

export type NewsDateRange = {
  fromEpochSeconds: number | null;
  toEpochSeconds: number | null;
};

type NormalizeNewsDateRangeOptions = {
  clampOpenEndedToNow?: boolean;
  now?: Date;
};

type BuildNewsWhereClauseOptions = NormalizeNewsDateRangeOptions;

function escapeManticoreMatchValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function escapeSqlStringValue(value: string) {
  return value.replaceAll("'", "\\'");
}

export function normalizeNewsSources(sources: string[]) {
  return [...new Set(sources.map((source) => source.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" })
  );
}

export function normalizeNewsEpochSecondsValue(value: string) {
  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const epochSeconds = Number(trimmedValue);

  if (!Number.isSafeInteger(epochSeconds) || epochSeconds < 0) {
    return null;
  }

  return epochSeconds;
}

function getCurrentEpochSeconds(now: Date) {
  return Math.floor(now.getTime() / 1000);
}

export function normalizeNewsDateRange(
  from: string,
  to: string,
  options: NormalizeNewsDateRangeOptions = {},
): NewsDateRange {
  const fromEpochSeconds = normalizeNewsEpochSecondsValue(from);
  const explicitToEpochSeconds = normalizeNewsEpochSecondsValue(to);

  if (
    fromEpochSeconds !== null &&
    explicitToEpochSeconds !== null &&
    fromEpochSeconds > explicitToEpochSeconds
  ) {
    return {
      fromEpochSeconds: null,
      toEpochSeconds: null,
    };
  }

  const toEpochSeconds =
    explicitToEpochSeconds ??
    (options.clampOpenEndedToNow ? getCurrentEpochSeconds(options.now ?? new Date()) : null);

  return {
    fromEpochSeconds,
    toEpochSeconds,
  };
}

export function shouldUseCachedNewsAggregateQuery(input: Pick<NormalizedNewsQueryInput, "to">) {
  return input.to !== "";
}

export function resolveNewsAggregateExecutionMode(input: Pick<NormalizedNewsQueryInput, "to">) {
  return shouldUseCachedNewsAggregateQuery(input) ? "cached" : "direct";
}

export function buildNewsWhereClause(
  query: string,
  sources: string[],
  from: string,
  to: string,
  extraConditions: string[] = [],
  options: BuildNewsWhereClauseOptions = {
    clampOpenEndedToNow: true,
  },
) {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedSources = normalizeNewsSources(sources);
  const { fromEpochSeconds, toEpochSeconds } = normalizeNewsDateRange(from, to, {
    clampOpenEndedToNow: options.clampOpenEndedToNow ?? true,
    now: options.now,
  });
  const conditions: string[] = [];

  if (normalizedQuery) {
    conditions.push(`MATCH('${escapeManticoreMatchValue(normalizedQuery)}')`);
  }

  if (normalizedSources.length > 0) {
    const sourceValues = normalizedSources.map((source) => `'${escapeSqlStringValue(source)}'`);

    conditions.push(`source IN (${sourceValues.join(", ")})`);
  }

  if (fromEpochSeconds !== null) {
    conditions.push(`publishedat >= ${fromEpochSeconds}`);
  }

  if (toEpochSeconds !== null) {
    conditions.push(`publishedat < ${toEpochSeconds + 60}`);
  }

  conditions.push(...extraConditions);

  if (conditions.length === 0) {
    return "";
  }

  return ` WHERE ${conditions.join(" AND ")}`;
}

export function normalizeNewsQueryInput(input: NewsQueryInput): NormalizedNewsQueryInput {
  return {
    aggregation: input.aggregation === "countries" ? "countries" : "sources",
    from: input.from.trim(),
    query: normalizeSearchQuery(input.query),
    sources: normalizeNewsSources(input.sources),
    to: input.to.trim(),
  };
}
