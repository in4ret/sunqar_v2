import type { CommentsChartResult, CommentsChartSourceTotal } from "./comments-chart.types";

export const MAX_CHART_POINTS = 1000;

type SourceTotalRow = {
  source?: number | string | null;
  total?: number | string | null;
};

function normalizeNumberValue(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

export function normalizeCommentsChartSource(source: number | string | null | undefined) {
  return String(source ?? "").trim().toLowerCase() || "unknown";
}

export function normalizeCommentsChartSourceTotals(rows: SourceTotalRow[]): CommentsChartSourceTotal[] {
  const totalsBySource = new Map<string, number>();

  for (const row of rows) {
    const source = normalizeCommentsChartSource(row.source);
    const total = normalizeNumberValue(row.total) ?? 0;

    totalsBySource.set(source, (totalsBySource.get(source) ?? 0) + total);
  }

  return [...totalsBySource.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([source, total]) => ({
      source,
      total,
    }));
}

export function getSampledCommentsChartSubtitleValues(
  result: Pick<CommentsChartResult, "isSampled" | "total">,
) {
  if (!result.isSampled) {
    return null;
  }

  return {
    sampleTotal: MAX_CHART_POINTS,
    total: result.total,
  };
}
