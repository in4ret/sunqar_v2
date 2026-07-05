import type { CommentsChartPoint } from "@/lib/comments/comments-chart.types";
import { normalizeCommentsChartSource } from "@/lib/comments/comments-chart-shared";

export function normalizeStoredCommentsPageChartSources(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedSources = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeCommentsChartSource(item));

  return [...new Set(normalizedSources)];
}

export function areCommentsPageChartSourcesEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function resolveCommentsPageChartSelectedSources(
  availableSources: string[],
  storedSources: string[] | null | undefined,
) {
  const normalizedAvailableSources = normalizeStoredCommentsPageChartSources(availableSources);

  if (normalizedAvailableSources.length === 0) {
    return [];
  }

  const availableSourceSet = new Set(normalizedAvailableSources);
  const normalizedStoredSources = normalizeStoredCommentsPageChartSources(storedSources).filter((source) =>
    availableSourceSet.has(source),
  );

  if (normalizedStoredSources.length === 0) {
    return normalizedAvailableSources;
  }

  const normalizedStoredSourceSet = new Set(normalizedStoredSources);

  return normalizedAvailableSources.filter((source) => normalizedStoredSourceSet.has(source));
}

export function toggleCommentsPageChartSourceSelection(
  selectedSources: string[],
  toggledSource: string,
  availableSources: string[],
) {
  const resolvedSelectedSources = resolveCommentsPageChartSelectedSources(
    availableSources,
    selectedSources,
  );
  const normalizedAvailableSources = normalizeStoredCommentsPageChartSources(availableSources);
  const normalizedToggledSource = normalizeCommentsChartSource(toggledSource);

  if (!normalizedAvailableSources.includes(normalizedToggledSource)) {
    return resolvedSelectedSources;
  }

  if (areCommentsPageChartSourcesEqual(resolvedSelectedSources, normalizedAvailableSources)) {
    return [normalizedToggledSource];
  }

  const nextSourceSet = new Set(resolvedSelectedSources);

  if (nextSourceSet.has(normalizedToggledSource)) {
    nextSourceSet.delete(normalizedToggledSource);
  } else {
    nextSourceSet.add(normalizedToggledSource);
  }

  if (nextSourceSet.size === 0) {
    return normalizedAvailableSources;
  }

  return normalizedAvailableSources.filter((source) => nextSourceSet.has(source));
}

export function filterCommentsChartPointsBySources(points: CommentsChartPoint[], selectedSources: string[]) {
  const selectedSourceSet = new Set(normalizeStoredCommentsPageChartSources(selectedSources));

  return points.filter((point) => selectedSourceSet.has(normalizeCommentsChartSource(point.source)));
}
