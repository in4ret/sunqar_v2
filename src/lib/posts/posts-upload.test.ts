import assert from "node:assert/strict";
import test from "node:test";

import type { InferInsertModel } from "drizzle-orm";

import { posts } from "@/lib/db/schema";
import {
  buildUniqueYoutubeContentIds,
  UploadYoutubePostsError,
  uploadYoutubePostsWithDependencies,
} from "@/lib/posts/posts-upload";
import {
  extractYoutubeContentIdFromUrl,
  parseYoutubeUploadInput,
} from "@/lib/posts/posts-youtube";

type NewPost = InferInsertModel<typeof posts>;
type InsertedTask = {
  payload: string[];
  taskId: string;
  userId: string;
};

test("parseYoutubeUploadInput splits links by commas whitespace and new lines", () => {
  assert.deepEqual(
    parseYoutubeUploadInput(
      "https://youtu.be/video-1, https://youtube.com/watch?v=video-2\n\thttps://youtube.com/shorts/video-3  https://youtube.com/live/video-4",
    ),
    [
      "https://youtu.be/video-1",
      "https://youtube.com/watch?v=video-2",
      "https://youtube.com/shorts/video-3",
      "https://youtube.com/live/video-4",
    ],
  );
});

test("extractYoutubeContentIdFromUrl supports watch short share and live links", () => {
  assert.equal(
    extractYoutubeContentIdFromUrl("https://www.youtube.com/watch?v=video-1&list=abc"),
    "video-1",
  );
  assert.equal(extractYoutubeContentIdFromUrl("https://youtu.be/video-2?t=15"), "video-2");
  assert.equal(extractYoutubeContentIdFromUrl("https://www.youtube.com/shorts/video-3?feature=share"), "video-3");
  assert.equal(extractYoutubeContentIdFromUrl("https://www.youtube.com/live/video-4?si=test"), "video-4");
  assert.equal(extractYoutubeContentIdFromUrl("https://example.com/video-5"), null);
  assert.equal(extractYoutubeContentIdFromUrl("not-a-url"), null);
});

test("buildUniqueYoutubeContentIds deduplicates extracted content ids and skips invalid urls", () => {
  assert.deepEqual(
    buildUniqueYoutubeContentIds([
      "https://youtu.be/video-1",
      "https://www.youtube.com/watch?v=video-1",
      "https://www.youtube.com/shorts/video-2",
      "https://example.com/video-3",
    ]),
    ["video-1", "video-2"],
  );
});

test("uploadYoutubePostsWithDependencies throws validation error for empty input", async () => {
  await assert.rejects(
    () =>
      uploadYoutubePostsWithDependencies(" \n\t ", {
        apiGatewayUrl: "https://gateway.example.com",
        fetchImpl: fetch,
        insertTask() {},
        reconcileTask() {},
        upsertPosts() {},
        youtubeApiKey: "test-key",
      }, "user-1"),
    (error: unknown) => error instanceof UploadYoutubePostsError && error.code === "comments-upload-empty",
  );
});

test("uploadYoutubePostsWithDependencies throws when api gateway url is missing", async () => {
  await assert.rejects(
    () =>
      uploadYoutubePostsWithDependencies("https://youtu.be/video-1", {
        apiGatewayUrl: null,
        fetchImpl: fetch,
        insertTask() {},
        reconcileTask() {},
        upsertPosts() {},
        youtubeApiKey: "test-key",
      }, "user-1"),
    (error: unknown) =>
      error instanceof UploadYoutubePostsError && error.code === "comments-upload-gateway-url-missing",
  );
});

test("uploadYoutubePostsWithDependencies throws when gateway request fails", async () => {
  await assert.rejects(
    () =>
      uploadYoutubePostsWithDependencies("https://youtu.be/video-1", {
        apiGatewayUrl: "https://gateway.example.com",
        fetchImpl: async () =>
          new Response("failure", {
            status: 500,
          }),
        insertTask() {},
        reconcileTask() {},
        upsertPosts() {},
        youtubeApiKey: "test-key",
      }, "user-1"),
    (error: unknown) =>
      error instanceof UploadYoutubePostsError && error.code === "comments-upload-gateway-request-failed",
  );
});

test("uploadYoutubePostsWithDependencies throws when no valid youtube urls remain after gateway call", async () => {
  await assert.rejects(
    () =>
      uploadYoutubePostsWithDependencies("https://example.com/video-1", {
        apiGatewayUrl: "https://gateway.example.com",
        fetchImpl: async () =>
          new Response(JSON.stringify([{ task_id: "task-123" }]), {
            status: 200,
          }),
        insertTask() {},
        reconcileTask() {},
        upsertPosts() {},
        youtubeApiKey: "test-key",
      }, "user-1"),
    (error: unknown) =>
      error instanceof UploadYoutubePostsError && error.code === "comments-upload-no-valid-youtube-urls",
  );
});

test("uploadYoutubePostsWithDependencies throws when youtube api key is missing", async () => {
  await assert.rejects(
    () =>
      uploadYoutubePostsWithDependencies("https://youtu.be/video-1", {
        apiGatewayUrl: "https://gateway.example.com",
        fetchImpl: async () =>
          new Response(JSON.stringify([{ task_id: "task-123" }]), {
            status: 200,
          }),
        insertTask() {},
        reconcileTask() {},
        upsertPosts() {},
        youtubeApiKey: "",
      }, "user-1"),
    (error: unknown) =>
      error instanceof UploadYoutubePostsError && error.code === "comments-upload-youtube-api-key-missing",
  );
});

test("uploadYoutubePostsWithDependencies throws when gateway response does not include a valid task id", async () => {
  await assert.rejects(
    () =>
      uploadYoutubePostsWithDependencies("https://youtu.be/video-1", {
        apiGatewayUrl: "https://gateway.example.com",
        fetchImpl: async () =>
          new Response(JSON.stringify([{ not_task_id: "task-123" }]), {
            status: 200,
          }),
        insertTask() {},
        reconcileTask() {},
        upsertPosts() {},
        youtubeApiKey: "test-key",
      }, "user-1"),
    (error: unknown) =>
      error instanceof UploadYoutubePostsError && error.code === "comments-upload-gateway-task-id-missing",
  );
});

test("uploadYoutubePostsWithDependencies posts original urls to gateway, stores task payload, and upserts ok youtube posts", async () => {
  const recordedRequests: Array<{ body: string; url: string }> = [];
  const recordedSteps: string[] = [];
  const insertedTasks: InsertedTask[] = [];
  const reconciledTaskIds: string[] = [];
  const upsertedRows: NewPost[] = [];

  const result = await uploadYoutubePostsWithDependencies(
    "https://youtu.be/video-1 https://www.youtube.com/watch?v=video-1 https://www.youtube.com/shorts/video-2 https://example.com/video-3",
    {
      apiGatewayUrl: "https://gateway.example.com/base/",
      fetchImpl: async (input, init) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/load_yt_videos2")) {
          recordedSteps.push("gateway");
          recordedRequests.push({
            body: typeof init?.body === "string" ? init.body : "",
            url,
          });

          return new Response(JSON.stringify([{ task_id: "task-123" }]), {
            status: 200,
          });
        }

        const parsedUrl = new URL(url);
        const ids = (parsedUrl.searchParams.get("id") ?? "").split(",").filter(Boolean);

        return new Response(
          JSON.stringify({
            items: ids.map((id) =>
              id === "video-2"
                ? {
                    id,
                    status: {
                      privacyStatus: "private",
                    },
                  }
                : {
                    id,
                    snippet: {
                      channelId: `channel-${id}`,
                      channelTitle: `Channel ${id}`,
                      publishedAt: "2026-07-01T10:15:00Z",
                      title: `Title ${id}`,
                    },
                    status: {
                      privacyStatus: "public",
                    },
                  },
            ),
          }),
          {
            status: 200,
          },
        );
      },
      insertTask(task) {
        recordedSteps.push("insert-task");
        insertedTasks.push(task);
      },
      reconcileTask(taskId) {
        recordedSteps.push("reconcile-task");
        reconciledTaskIds.push(taskId);
      },
      upsertPosts(rows) {
        recordedSteps.push("upsert-posts");
        upsertedRows.push(...rows);
      },
      youtubeApiKey: "test-key",
    },
    "user-1",
  );

  assert.deepEqual(recordedRequests, [
    {
      body: JSON.stringify({
        urls: [
          "https://youtu.be/video-1",
          "https://www.youtube.com/watch?v=video-1",
          "https://www.youtube.com/shorts/video-2",
          "https://example.com/video-3",
        ],
      }),
      url: "https://gateway.example.com/load_yt_videos2",
    },
  ]);
  assert.equal(result.insertedCount, 1);
  assert.equal(result.requestedUrlCount, 4);
  assert.deepEqual(recordedSteps, ["gateway", "insert-task", "reconcile-task", "upsert-posts"]);
  assert.deepEqual(insertedTasks, [
    {
      payload: ["video-1", "video-2"],
      taskId: "task-123",
      userId: "user-1",
    },
  ]);
  assert.deepEqual(reconciledTaskIds, ["task-123"]);
  assert.deepEqual(upsertedRows, [
    {
      channel: "channel-video-1",
      channelName: "Channel video-1",
      contentId: "video-1",
      contentTitle: "2026-07-01 15:15 Title video-1",
      id: "youtube:channel-video-1:video-1",
      publishedAt: "2026-07-01T10:15:00Z",
      source: "youtube",
    },
  ]);
});

test("uploadYoutubePostsWithDependencies stores unique content ids in task payload even when metadata is private or missing", async () => {
  const insertedTasks: InsertedTask[] = [];
  const reconciledTaskIds: string[] = [];
  const upsertedRows: NewPost[] = [];

  const result = await uploadYoutubePostsWithDependencies(
    "https://youtu.be/video-1 https://www.youtube.com/shorts/video-2",
    {
      apiGatewayUrl: "https://gateway.example.com",
      fetchImpl: async (input) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/load_yt_videos2")) {
          return new Response(JSON.stringify([{ task_id: "task-456" }]), {
            status: 200,
          });
        }

        return new Response(
          JSON.stringify({
            items: [
              {
                id: "video-1",
                status: {
                  privacyStatus: "private",
                },
              },
            ],
          }),
          {
            status: 200,
          },
        );
      },
      insertTask(task) {
        insertedTasks.push(task);
      },
      reconcileTask(taskId) {
        reconciledTaskIds.push(taskId);
      },
      upsertPosts(rows) {
        upsertedRows.push(...rows);
      },
      youtubeApiKey: "test-key",
    },
    "user-2",
  );

  assert.equal(result.insertedCount, 0);
  assert.equal(result.requestedUrlCount, 2);
  assert.deepEqual(insertedTasks, [
    {
      payload: ["video-1", "video-2"],
      taskId: "task-456",
      userId: "user-2",
    },
  ]);
  assert.deepEqual(reconciledTaskIds, ["task-456"]);
  assert.deepEqual(upsertedRows, []);
});
