import assert from "node:assert/strict";
import test from "node:test";

import { createCommentsCountPostHandler } from "@/lib/comments/comments-count-route";
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

test("comments count route returns 401 for unauthenticated requests", async () => {
  const handler = createCommentsCountPostHandler({
    countCommentsImpl: async () => 0,
    getCurrentUserImpl: async () => null,
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments", {
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

test("comments count route returns 400 for invalid request bodies", async () => {
  const handler = createCommentsCountPostHandler({
    countCommentsImpl: async () => 0,
    getCurrentUserImpl: async () => TEST_USER,
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments", {
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

test("comments count route returns numeric totals for valid requests", async () => {
  let capturedInput:
    | {
        from: string;
        posts: string[];
        query: string;
        to: string;
      }
    | undefined;

  const handler = createCommentsCountPostHandler({
    countCommentsImpl: async (input) => {
      capturedInput = input;

      return 42;
    },
    getCurrentUserImpl: async () => TEST_USER,
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments", {
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
  assert.deepEqual(await response.json(), {
    total: 42,
  });
});
