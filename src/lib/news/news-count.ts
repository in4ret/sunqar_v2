import "server-only";

import { manticoreSql } from "@/lib/manticore";
import { normalizeSearchQuery } from "@/lib/utils";

type CountRow = {
  total: number | string;
};

type NewsCountDateRange = {
  fromEpochSeconds: number | null;
  toEpochSeconds: number | null;
};

function escapeManticoreMatchValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function escapeSqlStringValue(value: string) {
  return value.replaceAll("'", "\\'");
}

function normalizeSources(sources: string[]) {
  return sources.map((source) => source.trim()).filter(Boolean);
}

function normalizeEpochSecondsValue(value: string) {
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

function normalizeNewsCountDateRange(from: string, to: string): NewsCountDateRange {
  const fromEpochSeconds = normalizeEpochSecondsValue(from);
  const toEpochSeconds = normalizeEpochSecondsValue(to);

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

function buildNewsCountWhereClause(query: string, sources: string[], from: string, to: string) {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedSources = normalizeSources(sources);
  const { fromEpochSeconds, toEpochSeconds } = normalizeNewsCountDateRange(from, to);
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

export async function countNews(input: { from: string; query: string; sources: string[]; to: string }) {
  const rows = await manticoreSql<CountRow>(
    `SELECT COUNT(*) AS total FROM news${buildNewsCountWhereClause(input.query, input.sources, input.from, input.to)}`
  );

  return Number(rows[0]?.total ?? 0);
}
