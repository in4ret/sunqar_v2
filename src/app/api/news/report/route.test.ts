import assert from "node:assert/strict";
import test from "node:test";

import type { User } from "@/lib/db/schema";
import { createNewsReportPostHandler } from "@/lib/news/news-report-route";

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

test("news report route returns 401 for unauthenticated requests", async () => {
  const handler = createNewsReportPostHandler({
    getCurrentUserImpl: async () => null,
    insertTaskImpl: async () => undefined,
    publishTaskSnapshotInvalidationImpl: async () => undefined,
    submitDownloadReportRequestImpl: async () => new Response(JSON.stringify({ task_id: "task-1" })),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/news/report", {
      body: JSON.stringify({
        additional_data: "",
        ids: [],
        keyWords: "",
        model: "gpt-4.1",
        opinion_data: "",
        prompt: "prompt",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 401);
});

test("news report route returns 400 when additional news fields are missing", async () => {
  const handler = createNewsReportPostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    insertTaskImpl: async () => undefined,
    publishTaskSnapshotInvalidationImpl: async () => undefined,
    submitDownloadReportRequestImpl: async () => new Response(JSON.stringify({ task_id: "task-1" })),
  });

  const response = await handler(
    new Request("http://sunqar.local/api/news/report", {
      body: JSON.stringify({
        ids: ["1"],
        keyWords: "",
        model: "gpt-4.1",
        prompt: "prompt",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 400);
});

test("news report route submits normalized payload and stores pending task", async () => {
  let capturedGatewayPayload:
    | {
        additional_data: string;
        author: string;
        ids: string[];
        key_words: string;
        model: string;
        opinion_data: string;
        prompt: string;
      }
    | undefined;
  let capturedInsertedTask:
    | {
        keyWords: string;
        taskId: string;
        userId: string;
      }
    | undefined;
  let invalidatedUserId: string | undefined;

  const handler = createNewsReportPostHandler({
    getCurrentUserImpl: async () => TEST_USER,
    insertTaskImpl: async (input) => {
      capturedInsertedTask = input;
    },
    publishTaskSnapshotInvalidationImpl: async (userId) => {
      invalidatedUserId = userId;
    },
    submitDownloadReportRequestImpl: async (payload) => {
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
    new Request("http://sunqar.local/api/news/report", {
      body: JSON.stringify({
        additional_data: " extra context ",
        ids: [" 100 ", " ", "200"],
        keyWords: "  hello   world  ",
        model: " gpt-4.1 ",
        opinion_data: " public opinion ",
        prompt: " report prompt ",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(capturedGatewayPayload, {
    additional_data: "extra context",
    author: "Test User",
    ids: ["100", "200"],
    key_words: "hello   world",
    model: "gpt-4.1",
    opinion_data: "public opinion",
    prompt: "report prompt",
  });
  assert.deepEqual(capturedInsertedTask, {
    keyWords: "hello   world",
    taskId: "task-123",
    userId: "user-1",
  });
  assert.equal(invalidatedUserId, "user-1");
  assert.deepEqual(await response.json(), {
    ok: true,
    taskId: "task-123",
  });
});
