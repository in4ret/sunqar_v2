import assert from "node:assert/strict";
import test from "node:test";

import type { CommentsChartResult } from "@/lib/comments/comments-chart.types";
import { createCommentsChartPostHandler } from "@/lib/comments/comments-chart-route";
import type { User } from "@/lib/db/schema";

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

test("comments chart route returns 401 for unauthenticated requests", async () => {
  const handler = createCommentsChartPostHandler({
    getCurrentUserImpl: async () => null,
    listCommentsChartPointsImpl: async () => ({
      isSampled: false,
      points: [],
      sampleTotal: 0,
      sourceTotals: [],
      total: 0,
    }),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/chart", {
      body: JSON.stringify({
        posts: [],
        query: "",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 401);
});

test("comments chart route returns 400 for invalid request bodies", async () => {
  const handler = createCommentsChartPostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    listCommentsChartPointsImpl: async () => ({
      isSampled: false,
      points: [],
      sampleTotal: 0,
      sourceTotals: [],
      total: 0,
    }),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/chart", {
      body: JSON.stringify({
        posts: [1],
        query: "",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 400);
});

test("comments chart route returns normalized results for valid requests", async () => {
  let capturedInput:
    | {
        from: string;
        posts: string[];
        query: string;
        to: string;
      }
    | undefined;

  const result: CommentsChartResult = {
    isSampled: true,
    points: [
      {
        comment: "Hello",
        comment_id: "comment-1",
        content_id: "video-1",
        id: "point-1",
        publishedat: 100,
        source: "youtube",
        threat: 0.25,
        toxic: 0.75,
        username: "alice",
      },
    ],
    sampleTotal: 1,
    sourceTotals: [
      {
        source: "youtube",
        total: 10,
      },
    ],
    total: 10,
  };

  const handler = createCommentsChartPostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    listCommentsChartPointsImpl: async (input) => {
      capturedInput = input;

      return result;
    },
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/chart", {
      body: JSON.stringify({
        from: " 100 ",
        posts: ["post-1"],
        query: "  hello   world  ",
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
    from: "100",
    posts: ["post-1"],
    query: "hello world",
    to: "200",
  });
  assert.deepEqual(await response.json(), result);
});
