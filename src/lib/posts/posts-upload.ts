import { type InferInsertModel } from "drizzle-orm";

import { refreshCommentsPostOptionsCache } from "@/lib/comments";
import { posts, tasks } from "@/lib/db/schema";
import { env } from "@/lib/env";
import {
  chunkValues,
  extractYoutubeContentIdFromUrl,
  fetchYoutubeMetadata,
  mapYoutubeMetadataUpdateToPost,
  parseYoutubeUploadInput,
} from "@/lib/posts/posts-youtube";
import { publishTaskSnapshotInvalidation } from "@/lib/task-stream-sync";
import { extractTaskId } from "@/lib/tasks/extract-task-id";

export type UploadYoutubePostsErrorCode =
  | "comments-upload-empty"
  | "comments-upload-gateway-request-failed"
  | "comments-upload-gateway-task-id-missing"
  | "comments-upload-gateway-url-missing"
  | "comments-upload-no-valid-youtube-urls"
  | "comments-upload-youtube-api-key-missing";

export class UploadYoutubePostsError extends Error {
  code: UploadYoutubePostsErrorCode;

  constructor(code: UploadYoutubePostsErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "UploadYoutubePostsError";
  }
}

type NewPost = InferInsertModel<typeof posts>;

type UploadYoutubePostsDependencies = {
  apiGatewayUrl: string | null;
  fetchImpl: typeof fetch;
  insertTask: (input: { payload: string[]; taskId: string; userId: string }) => Promise<void> | void;
  reconcileTask: (taskId: string) => Promise<void> | void;
  upsertPosts: (rows: NewPost[]) => Promise<void> | void;
  youtubeApiKey: string;
};

const UPSERT_POSTS_CHUNK_SIZE = 100;

export function buildUniqueYoutubeContentIds(urls: string[]) {
  return Array.from(
    new Set(
      urls
        .map((url) => extractYoutubeContentIdFromUrl(url))
        .filter((contentId): contentId is string => !!contentId),
    ),
  );
}

export async function upsertYoutubePosts(rows: NewPost[]) {
  const { db } = await import("@/lib/db/client");

  db.transaction((tx) => {
    for (const chunk of chunkValues(rows, UPSERT_POSTS_CHUNK_SIZE)) {
      for (const row of chunk) {
        tx.insert(posts)
          .values(row)
          .onConflictDoUpdate({
            set: {
              channelName: row.channelName,
              contentTitle: row.contentTitle,
              id: row.id,
              publishedAt: row.publishedAt,
            },
            target: [posts.source, posts.channel, posts.contentId],
          })
          .run();
      }
    }
  });
}

export async function uploadYoutubePostsWithDependencies(
  rawInput: string,
  {
    apiGatewayUrl,
    fetchImpl,
    insertTask: insertTaskImpl,
    reconcileTask: reconcileTaskImpl,
    upsertPosts: upsertPostsImpl,
    youtubeApiKey,
  }: UploadYoutubePostsDependencies,
  userId: string,
) {
  const urls = parseYoutubeUploadInput(rawInput);

  if (urls.length === 0) {
    throw new UploadYoutubePostsError("comments-upload-empty");
  }

  if (!apiGatewayUrl) {
    throw new UploadYoutubePostsError("comments-upload-gateway-url-missing");
  }

  const gatewayUrl = new URL("/load_yt_videos2", apiGatewayUrl);
  const gatewayResponse = await fetchImpl(gatewayUrl, {
    body: JSON.stringify({ urls }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!gatewayResponse.ok) {
    throw new UploadYoutubePostsError(
      "comments-upload-gateway-request-failed",
      `YouTube gateway request failed with status ${gatewayResponse.status}.`,
    );
  }

  const uniqueContentIds = buildUniqueYoutubeContentIds(urls);

  if (uniqueContentIds.length === 0) {
    throw new UploadYoutubePostsError("comments-upload-no-valid-youtube-urls");
  }

  const gatewayResponseData = await gatewayResponse.json();
  const taskId = extractTaskId(gatewayResponseData);

  if (!taskId) {
    throw new UploadYoutubePostsError("comments-upload-gateway-task-id-missing");
  }

  if (!youtubeApiKey) {
    throw new UploadYoutubePostsError("comments-upload-youtube-api-key-missing");
  }

  const metadataUpdates = await fetchYoutubeMetadata(uniqueContentIds, youtubeApiKey, fetchImpl);

  await insertTaskImpl({
    payload: uniqueContentIds,
    taskId,
    userId,
  });
  await reconcileTaskImpl(taskId);

  const postRows = metadataUpdates
    .map(mapYoutubeMetadataUpdateToPost)
    .filter((row): row is NewPost => row !== null);

  if (postRows.length > 0) {
    await upsertPostsImpl(postRows);
    await refreshCommentsPostOptionsCache();
  }

  return {
    insertedCount: postRows.length,
    requestedUrlCount: urls.length,
  };
}

async function insertYoutubeTask(input: { payload: string[]; taskId: string; userId: string }) {
  const { db } = await import("@/lib/db/client");

  db.insert(tasks)
    .values({
      createdAt: new Date(),
      doneAt: null,
      downloadUrl: null,
      error: null,
      keyWords: "Новые видео YouTube",
      payload: input.payload,
      read: false,
      reportId: null,
      status: "pending",
      taskId: input.taskId,
      type: "load_yt_videos2",
      userId: input.userId,
    })
    .run();

  await publishTaskSnapshotInvalidation(input.userId);
}

export async function uploadYoutubePosts(rawInput: string, userId: string) {
  const { reconcileTaskById } = await import("@/lib/redis/celery-task-meta");

  return uploadYoutubePostsWithDependencies(rawInput, {
    apiGatewayUrl: env.apiGatewayUrl,
    fetchImpl: fetch,
    insertTask: insertYoutubeTask,
    reconcileTask: reconcileTaskById,
    upsertPosts: upsertYoutubePosts,
    youtubeApiKey: env.youtubeApiKey,
  }, userId);
}
