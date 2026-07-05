import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCommentsChartSourceLabel,
  getCommentsSourceIconSrc,
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

test("formatCommentsChartSourceLabel maps known sources to display names", () => {
  assert.equal(formatCommentsChartSourceLabel("ig"), "Instagram");
  assert.equal(formatCommentsChartSourceLabel("tiktok"), "TikTok");
  assert.equal(formatCommentsChartSourceLabel("youtube"), "YouTube");
});

test("formatCommentsChartSourceLabel normalizes whitespace and casing for known sources", () => {
  assert.equal(formatCommentsChartSourceLabel("  IG "), "Instagram");
  assert.equal(formatCommentsChartSourceLabel(" TikTok "), "TikTok");
  assert.equal(formatCommentsChartSourceLabel(" YouTube "), "YouTube");
});

test("formatCommentsChartSourceLabel falls back to trimmed source or unknown", () => {
  assert.equal(formatCommentsChartSourceLabel(" Threads "), "Threads");
  assert.equal(formatCommentsChartSourceLabel(""), "unknown");
  assert.equal(formatCommentsChartSourceLabel(null), "unknown");
});

test("getCommentsSourceIconSrc maps known sources to asset paths", () => {
  assert.equal(getCommentsSourceIconSrc("ig"), "/assets/instagram.svg");
  assert.equal(getCommentsSourceIconSrc("tiktok"), "/assets/tiktok.svg");
  assert.equal(getCommentsSourceIconSrc("youtube"), "/assets/youtube.svg");
});

test("getCommentsSourceIconSrc normalizes whitespace and casing for known sources", () => {
  assert.equal(getCommentsSourceIconSrc("  IG "), "/assets/instagram.svg");
  assert.equal(getCommentsSourceIconSrc(" TikTok "), "/assets/tiktok.svg");
  assert.equal(getCommentsSourceIconSrc(" YouTube "), "/assets/youtube.svg");
});

test("getCommentsSourceIconSrc returns undefined for unknown and empty sources", () => {
  assert.equal(getCommentsSourceIconSrc("threads"), undefined);
  assert.equal(getCommentsSourceIconSrc(""), undefined);
  assert.equal(getCommentsSourceIconSrc(null), undefined);
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
