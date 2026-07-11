import assert from "node:assert/strict";
import test from "node:test";

import type { User } from "@/lib/db/schema";
import { createNewsChartPostHandler } from "@/lib/news/news-chart-route";
import type { NewsChartStats } from "@/lib/news/news-chart-shared";
import type { NewsQueryInput } from "@/lib/news/news-filters";

const TEST_USER: User = {
  createdAt: new Date(0),
  displayName: "Test User",
  id: "user-1",
  isActive: true,
  login: "test-user",
  passwordHash: "hash",
  role: "user",
  updatedAt: new Date(0),
};

test("news chart route returns 401 for unauthenticated requests", async () => {
  const handler = createNewsChartPostHandler({
    getCurrentUserImpl: async () => null,
    getNewsChartImpl: async () => ({
      aggregation: "sources",
      buckets: [],
      granularity: "day",
      items: [],
    }),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/news/chart", {
      body: JSON.stringify({
        aggregation: "sources",
        query: "",
        sources: [],
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 401);
});

test("news chart route returns 400 for invalid request bodies", async () => {
  const handler = createNewsChartPostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    getNewsChartImpl: async () => ({
      aggregation: "sources",
      buckets: [],
      granularity: "day",
      items: [],
    }),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/news/chart", {
      body: JSON.stringify({
        aggregation: "invalid",
        query: "",
        sources: [],
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 400);
});

test("news chart route returns normalized results for valid requests", async () => {
  let capturedInput: NewsQueryInput | undefined;

  const result: NewsChartStats = {
    aggregation: "countries",
    buckets: [
      {
        bucketEnd: "2026-07-11",
        bucketStart: "2026-07-11",
        segments: [
          {
            key: "kz",
            total: 10,
          },
        ],
        total: 10,
      },
    ],
    granularity: "day",
    items: ["kz"],
  };

  const handler = createNewsChartPostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    getNewsChartImpl: async (input) => {
      capturedInput = input;

      return result;
    },
  });

  const response = await handler(
    new Request("http://sunqar.local/api/news/chart", {
      body: JSON.stringify({
        aggregation: "countries",
        from: " 100 ",
        query: "  hello   world  ",
        sources: ["source-1"],
        to: " 200 ",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(capturedInput, {
    aggregation: "countries",
    from: "100",
    query: "hello world",
    sources: ["source-1"],
    to: "200",
  });
  assert.deepEqual(await response.json(), result);
});
