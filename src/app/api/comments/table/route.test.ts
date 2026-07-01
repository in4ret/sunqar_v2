import assert from "node:assert/strict";
import test from "node:test";

import type { CommentsTableQueryInput, CommentsTableResult } from "@/lib/comments/comments-table.types";
import { createCommentsTablePostHandler } from "@/lib/comments/comments-table-route";
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

test("comments table route returns 401 for unauthenticated requests", async () => {
  const handler = createCommentsTablePostHandler({
    getCurrentUserImpl: async () => null,
    listCommentsTableRowsImpl: async () => ({
      pageIndex: 0,
      pageSize: 10,
      rows: [],
      total: 0,
    }),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/table", {
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

test("comments table route returns 400 for invalid request bodies", async () => {
  const handler = createCommentsTablePostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    listCommentsTableRowsImpl: async () => ({
      pageIndex: 0,
      pageSize: 10,
      rows: [],
      total: 0,
    }),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/table", {
      body: JSON.stringify({
        pageIndex: "0",
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

test("comments table route returns 400 for invalid table filters", async () => {
  const handler = createCommentsTablePostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    listCommentsTableRowsImpl: async () => ({
      pageIndex: 0,
      pageSize: 10,
      rows: [],
      total: 0,
    }),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/table", {
      body: JSON.stringify({
        posts: [],
        query: "",
        tableFilters: {
          likesFrom: 1,
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 400);
});

test("comments table route returns normalized results for valid requests", async () => {
  let capturedInput: CommentsTableQueryInput | undefined;

  const result: CommentsTableResult = {
    pageIndex: 2,
    pageSize: 50,
    rows: [
      {
        call_to_action: 0,
        comment: "Hello",
        comment_id: "youtube-comment-1",
        content_id: "post-42",
        id: "1",
        likes: 4,
        publishedat: 100,
        source: "youtube",
        threat: 0,
        toxic: 1,
        username: "user-1",
      },
    ],
    total: 1,
  };

  const handler = createCommentsTablePostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    listCommentsTableRowsImpl: async (input) => {
      capturedInput = input;

      return result;
    },
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/table", {
      body: JSON.stringify({
        from: " 100 ",
        pageIndex: 2,
        pageSize: 50,
        posts: ["post-1"],
        query: "  hello   world  ",
        sort: {
          direction: "desc",
          field: "publishedat",
        },
        tableFilters: {
          callToActionFrom: " 0.1 ",
          callToActionTo: " 0.9 ",
          comment: "  spam  ",
          likesFrom: " 1 ",
          likesTo: " 10 ",
          threatFrom: " 0.2 ",
          threatTo: " 0.8 ",
          toxicFrom: " 0.3 ",
          toxicTo: " 0.7 ",
          username: "  alice  ",
        },
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
    pageIndex: 2,
    pageSize: 50,
    posts: ["post-1"],
    query: "hello world",
    sort: {
      direction: "desc",
      field: "publishedat",
    },
    tableFilters: {
      callToActionFrom: "0.1",
      callToActionTo: "0.9",
      comment: "spam",
      likesFrom: "1",
      likesTo: "10",
      threatFrom: "0.2",
      threatTo: "0.8",
      toxicFrom: "0.3",
      toxicTo: "0.7",
      username: "alice",
    },
    to: "200",
  });
  assert.deepEqual(await response.json(), result);
});
