import "server-only";

import { normalizeSearchQuery } from "@/lib/utils";

export type NewsQueryInput = {
  from: string;
  query: string;
  sources: string[];
  to: string;
};

export type NormalizedNewsQueryInput = {
  from: string;
  query: string;
  sources: string[];
  to: string;
};

export type NewsDateRange = {
  fromEpochSeconds: number | null;
  toEpochSeconds: number | null;
};

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

export function normalizeNewsDateRange(from: string, to: string): NewsDateRange {
  const fromEpochSeconds = normalizeNewsEpochSecondsValue(from);
  const toEpochSeconds = normalizeNewsEpochSecondsValue(to);

  if (
    fromEpochSeconds !== null &&
    toEpochSeconds !== null &&
    fromEpochSeconds > toEpochSeconds
  ) {
    return {
      fromEpochSeconds: null,
      toEpochSeconds: null,
    };
  }

  return {
    fromEpochSeconds,
    toEpochSeconds,
  };
}

export function buildNewsWhereClause(query: string, sources: string[], from: string, to: string) {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedSources = normalizeNewsSources(sources);
  const { fromEpochSeconds, toEpochSeconds } = normalizeNewsDateRange(from, to);
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

  if (conditions.length === 0) {
    return "";
  }

  return ` WHERE ${conditions.join(" AND ")}`;
}

export function normalizeNewsQueryInput(input: NewsQueryInput): NormalizedNewsQueryInput {
  return {
    from: input.from.trim(),
    query: normalizeSearchQuery(input.query),
    sources: normalizeNewsSources(input.sources),
    to: input.to.trim(),
  };
}
