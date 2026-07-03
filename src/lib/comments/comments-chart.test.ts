import assert from "node:assert/strict";
import test from "node:test";

import { sampleCommentsChartPoints } from "./comments-chart";
import { MAX_CHART_POINTS } from "./comments-chart-shared";

function createPoint(index: number) {
  return {
    comment: `comment-${index}`,
    comment_id: `comment-id-${index}`,
    content_id: `content-${index}`,
    id: `id-${index}`,
    publishedat: 1000 - index,
    source: "youtube",
    threat: index / 100,
    toxic: index / 100,
    username: `user-${index}`,
  };
}

test("sampleCommentsChartPoints returns original points when limit is not exceeded", () => {
  const points = [createPoint(0), createPoint(1), createPoint(2)];

  assert.deepEqual(sampleCommentsChartPoints(points, 3, 10), points);
});

test("sampleCommentsChartPoints keeps every Nth point for large totals", () => {
  const points = Array.from({ length: 20 }, (_, index) => createPoint(index));
  const result = sampleCommentsChartPoints(points, 20, 5);

  assert.equal(result.length, 5);
  assert.deepEqual(
    result.map((point) => point.id),
    ["id-0", "id-4", "id-8", "id-12", "id-16"],
  );
});

test("sampleCommentsChartPoints limits sampled results to MAX_CHART_POINTS", () => {
  const total = MAX_CHART_POINTS + 500;
  const points = Array.from({ length: MAX_CHART_POINTS * 2 }, (_, index) => createPoint(index));
  const result = sampleCommentsChartPoints(points, total, MAX_CHART_POINTS);

  assert.equal(result.length, MAX_CHART_POINTS);
});
