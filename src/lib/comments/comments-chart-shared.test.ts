import assert from "node:assert/strict";
import test from "node:test";

import {
  getSampledCommentsChartSubtitleValues,
  MAX_CHART_POINTS,
  normalizeCommentsChartSource,
  normalizeCommentsChartSourceTotals,
} from "./comments-chart-shared";

test("getSampledCommentsChartSubtitleValues returns MAX_CHART_POINTS for sampled results", () => {
  assert.deepEqual(
    getSampledCommentsChartSubtitleValues({
      isSampled: true,
      total: 1500,
    }),
    {
      sampleTotal: MAX_CHART_POINTS,
      total: 1500,
    },
  );
});

test("getSampledCommentsChartSubtitleValues uses MAX_CHART_POINTS when total is just above the limit", () => {
  assert.deepEqual(
    getSampledCommentsChartSubtitleValues({
      isSampled: true,
      total: MAX_CHART_POINTS + 1,
    }),
    {
      sampleTotal: MAX_CHART_POINTS,
      total: MAX_CHART_POINTS + 1,
    },
  );
});

test("getSampledCommentsChartSubtitleValues returns null for non-sampled results", () => {
  assert.equal(
    getSampledCommentsChartSubtitleValues({
      isSampled: false,
      total: MAX_CHART_POINTS,
    }),
    null,
  );
});

test("normalizeCommentsChartSource collapses empty values into unknown", () => {
  assert.equal(normalizeCommentsChartSource(""), "unknown");
  assert.equal(normalizeCommentsChartSource("   "), "unknown");
  assert.equal(normalizeCommentsChartSource(null), "unknown");
});

test("normalizeCommentsChartSource lowercases and trims source values", () => {
  assert.equal(normalizeCommentsChartSource(" YouTube "), "youtube");
  assert.equal(normalizeCommentsChartSource(" TikTok "), "tiktok");
});

test("normalizeCommentsChartSourceTotals merges totals by normalized source", () => {
  const result = normalizeCommentsChartSourceTotals([
    { source: "YouTube", total: 5 },
    { source: " youtube ", total: 7 },
    { source: "", total: 2 },
    { source: null, total: 3 },
    { source: "TikTok", total: 4 },
  ]);

  assert.deepEqual(result, [
    { source: "tiktok", total: 4 },
    { source: "unknown", total: 5 },
    { source: "youtube", total: 12 },
  ]);
});
