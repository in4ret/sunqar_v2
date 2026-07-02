import assert from "node:assert/strict";
import test from "node:test";

import { createCommentsReportPostHandler } from "@/lib/comments/comments-report-route";
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

test("comments report route returns 401 for unauthenticated requests", async () => {
  const handler = createCommentsReportPostHandler({
    getCurrentUserImpl: async () => null,
    insertTaskImpl: async () => undefined,
    listCommentIdsForReportImpl: async () => [],
    publishTaskSnapshotInvalidationImpl: async () => undefined,
    submitDownloadCommentsRequestImpl: async () => new Response(JSON.stringify({ task_id: "task-1" })),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/report", {
      body: JSON.stringify({
        model: "gpt-4.1",
        posts: [],
        prompt: "prompt",
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

test("comments report route returns 400 for invalid request bodies", async () => {
  const handler = createCommentsReportPostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    insertTaskImpl: async () => undefined,
    listCommentIdsForReportImpl: async () => [],
    publishTaskSnapshotInvalidationImpl: async () => undefined,
    submitDownloadCommentsRequestImpl: async () => new Response(JSON.stringify({ task_id: "task-1" })),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/report", {
      body: JSON.stringify({
        model: "gpt-4.1",
        posts: [1],
        prompt: "prompt",
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

test("comments report route submits normalized payload and stores pending task", async () => {
  let capturedIdsInput:
    | {
        from: string;
        posts: string[];
        query: string;
        to: string;
      }
    | undefined;
  let capturedGatewayPayload:
    | {
        author: string;
        ids: string[];
        key_words: string;
        model: string;
        prompt: string;
      }
    | undefined;
  let capturedInsertedTask:
    | {
        keyWord: string;
        taskId: string;
        userId: string;
      }
    | undefined;
  let invalidatedUserId: string | undefined;

  const handler = createCommentsReportPostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    insertTaskImpl: async (input) => {
      capturedInsertedTask = input;
    },
    listCommentIdsForReportImpl: async (input) => {
      capturedIdsInput = input;

      return ["100", "200"];
    },
    publishTaskSnapshotInvalidationImpl: async (userId) => {
      invalidatedUserId = userId;
    },
    submitDownloadCommentsRequestImpl: async (payload) => {
      capturedGatewayPayload = payload;

      return new Response(JSON.stringify({ task_id: "task-123" }), {
        headers: {
          "Content-Type": "application/json",
        },
        status: 200,
      });
    },
  });

  const response = await handler(
    new Request("http://sunqar.local/api/comments/report", {
      body: JSON.stringify({
        from: " 100 ",
        model: " gpt-4.1 ",
        posts: ["post-1"],
        prompt: " report prompt ",
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
  assert.deepEqual(capturedIdsInput, {
    from: "100",
    posts: ["post-1"],
    query: "hello world",
    to: "200",
  });
  assert.deepEqual(capturedGatewayPayload, {
    author: "Test User",
    ids: ["100", "200"],
    key_words: "hello world",
    model: "gpt-4.1",
    prompt: "report prompt",
  });
  assert.deepEqual(capturedInsertedTask, {
    keyWord: "hello world",
    taskId: "task-123",
    userId: "user-1",
  });
  assert.equal(invalidatedUserId, "user-1");
  assert.deepEqual(await response.json(), {
    ok: true,
    taskId: "task-123",
  });
});
