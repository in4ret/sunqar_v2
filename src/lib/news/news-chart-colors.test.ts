import assert from "node:assert/strict";
import test from "node:test";

import {
  getNewsChartItemColor,
  getNewsCountryColor,
} from "./news-chart-colors";
import {
  OTHER_NEWS_SOURCE,
  UNKNOWN_NEWS_COUNTRY,
  UNKNOWN_NEWS_SOURCE,
} from "./news-chart-shared";

test("getNewsCountryColor returns fixed flag-adjacent colors for Kazakhstan and Russia", () => {
  assert.equal(getNewsCountryColor("kz"), "#00afca");
  assert.equal(getNewsCountryColor(" KZ "), "#00afca");
  assert.equal(getNewsCountryColor("ru"), "#1f5fbf");
});

test("getNewsCountryColor keeps unknown country neutral", () => {
  assert.equal(getNewsCountryColor(UNKNOWN_NEWS_COUNTRY), "#708b9f");
});

test("getNewsCountryColor uses a stable fallback for other countries", () => {
  assert.equal(getNewsCountryColor("de"), getNewsCountryColor("de"));
  assert.notEqual(getNewsCountryColor("de"), "#00afca");
  assert.notEqual(getNewsCountryColor("de"), "#1f5fbf");
});

test("getNewsChartItemColor preserves source palette behavior", () => {
  assert.equal(getNewsChartItemColor(OTHER_NEWS_SOURCE, "sources"), "#8f96a3");
  assert.equal(getNewsChartItemColor(UNKNOWN_NEWS_SOURCE, "sources"), "#708b9f");
  assert.equal(getNewsChartItemColor("youtube", "sources"), getNewsChartItemColor("youtube", "sources"));
});

test("getNewsChartItemColor uses country overrides in countries mode", () => {
  assert.equal(getNewsChartItemColor("kz", "countries"), "#00afca");
  assert.equal(getNewsChartItemColor("ru", "countries"), "#1f5fbf");
  assert.equal(getNewsChartItemColor(UNKNOWN_NEWS_COUNTRY, "countries"), "#708b9f");
});
