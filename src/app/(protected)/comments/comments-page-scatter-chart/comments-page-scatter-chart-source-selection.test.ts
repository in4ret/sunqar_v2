import assert from "node:assert/strict";
import test from "node:test";

import type { CommentsChartPoint } from "@/lib/comments/comments-chart.types";

import {
  filterCommentsChartPointsBySources,
  normalizeStoredCommentsPageChartSources,
  resolveCommentsPageChartSelectedSources,
  toggleCommentsPageChartSourceSelection,
} from "./comments-page-scatter-chart-source-selection";

function createPoint(source: string, id: string): CommentsChartPoint {
  return {
    comment: `comment-${id}`,
    comment_id: `comment-id-${id}`,
    content_id: `content-${id}`,
    id,
    publishedat: 100,
    source,
    threat: 0.2,
    toxic: 0.4,
    username: `user-${id}`,
  };
}

test("normalizeStoredCommentsPageChartSources normalizes and deduplicates values", () => {
  assert.deepEqual(
    normalizeStoredCommentsPageChartSources([" YouTube ", "ig", "youtube", 123, "tiktok"]),
    ["youtube", "ig", "tiktok"],
  );
});

test("resolveCommentsPageChartSelectedSources falls back to all sources when stored selection is empty", () => {
  assert.deepEqual(
    resolveCommentsPageChartSelectedSources(["youtube", "ig", "tiktok"], []),
    ["youtube", "ig", "tiktok"],
  );
});

test("resolveCommentsPageChartSelectedSources drops stale stored sources and preserves available order", () => {
  assert.deepEqual(
    resolveCommentsPageChartSelectedSources(["youtube", "ig", "tiktok"], ["tiktok", "missing", "youtube"]),
    ["youtube", "tiktok"],
  );
});

test("resolveCommentsPageChartSelectedSources falls back to all sources when stored selection is fully stale", () => {
  assert.deepEqual(
    resolveCommentsPageChartSelectedSources(["youtube", "ig"], ["missing"]),
    ["youtube", "ig"],
  );
});

test("toggleCommentsPageChartSourceSelection narrows to the clicked source when all are selected", () => {
  const availableSources = ["youtube", "ig", "tiktok"];

  assert.deepEqual(
    toggleCommentsPageChartSourceSelection(["youtube", "ig", "tiktok"], "ig", availableSources),
    ["ig"],
  );
});

test("toggleCommentsPageChartSourceSelection supports multi-select and restores all when last source is removed", () => {
  const availableSources = ["youtube", "ig", "tiktok"];

  assert.deepEqual(
    toggleCommentsPageChartSourceSelection(["youtube", "tiktok"], "youtube", availableSources),
    ["tiktok"],
  );
  assert.deepEqual(
    toggleCommentsPageChartSourceSelection(["youtube"], "youtube", ["youtube"]),
    ["youtube"],
  );
  assert.deepEqual(
    toggleCommentsPageChartSourceSelection(["youtube"], "ig", availableSources),
    ["youtube", "ig"],
  );
});

test("filterCommentsChartPointsBySources returns only points matching selected sources", () => {
  const points = [
    createPoint("youtube", "a"),
    createPoint("ig", "b"),
    createPoint("tiktok", "c"),
  ];

  assert.deepEqual(
    filterCommentsChartPointsBySources(points, ["youtube", "tiktok"]).map((point) => point.id),
    ["a", "c"],
  );
});
