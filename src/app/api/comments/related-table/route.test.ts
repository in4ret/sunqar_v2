import assert from "node:assert/strict";
import test from "node:test";

import type {
  CommentsRelatedTableQueryInput,
  CommentsRelatedTableResult,
} from "@/lib/comments/comments-related-table.types";
import { createCommentsRelatedTablePostHandler } from "@/lib/comments/comments-related-table-route";
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

test("comments related table route returns 401 for unauthenticated requests", async () => {
  const handler = createCommentsRelatedTablePostHandler({
    getCurrentUserImpl: async () => null,
    listCommentsRelatedTableRowsImpl: async () => ({
      pageIndex: 0,
      pageSize: 10,
      rows: [],
      total: 0,
    }),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/related-table", {
      body: JSON.stringify({
        commentId: "1",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 401);
});

test("comments related table route returns 400 for invalid request bodies", async () => {
  const handler = createCommentsRelatedTablePostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    listCommentsRelatedTableRowsImpl: async () => ({
      pageIndex: 0,
      pageSize: 10,
      rows: [],
      total: 0,
    }),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/related-table", {
      body: JSON.stringify({
        commentId: 1,
        pageIndex: "0",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 400);
});

test("comments related table route returns 400 for invalid table filters", async () => {
  const handler = createCommentsRelatedTablePostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    listCommentsRelatedTableRowsImpl: async () => ({
      pageIndex: 0,
      pageSize: 10,
      rows: [],
      total: 0,
    }),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/related-table", {
      body: JSON.stringify({
        commentId: "1",
        tableFilters: {
          similarityFrom: 1,
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

test("comments related table route returns normalized results for valid requests", async () => {
  let capturedInput: CommentsRelatedTableQueryInput | undefined;

  const result: CommentsRelatedTableResult = {
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
        similarity: 0.12,
        source: "youtube",
        threat: 0,
        toxic: 1,
        username: "user-1",
      },
    ],
    total: 1,
  };

  const handler = createCommentsRelatedTablePostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    listCommentsRelatedTableRowsImpl: async (input) => {
      capturedInput = input;

      return result;
    },
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/related-table", {
      body: JSON.stringify({
        commentId: " 100 ",
        pageIndex: 2,
        pageSize: 50,
        sort: {
          direction: "asc",
          field: "similarity",
        },
        tableFilters: {
          comment: "  spam  ",
          likesFrom: " 1 ",
          likesTo: " 10 ",
          similarityFrom: " 0.1 ",
          similarityTo: " 0.9 ",
          username: "  alice  ",
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(capturedInput, {
    commentId: "100",
    pageIndex: 2,
    pageSize: 50,
    sort: {
      direction: "asc",
      field: "similarity",
    },
    tableFilters: {
      comment: "spam",
      likesFrom: "1",
      likesTo: "10",
      similarityFrom: "0.1",
      similarityTo: "0.9",
      username: "alice",
    },
  });
  assert.deepEqual(await response.json(), result);
});
