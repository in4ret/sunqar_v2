import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLoadYoutubeVideosTaskDownloadUrl,
  normalizeLoadYoutubeVideosTaskPayload,
  resolveSuccessfulTaskDownloadUrl,
} from "@/lib/redis/celery-task-meta-helpers";

test("normalizeLoadYoutubeVideosTaskPayload trims, deduplicates, and drops invalid values", () => {
  assert.deepEqual(
    normalizeLoadYoutubeVideosTaskPayload(["video-1", " video-2 ", "video-1", "", 42, null]),
    ["video-1", "video-2"],
  );
});

test("buildLoadYoutubeVideosTaskDownloadUrl builds internal comments text link with content ids payload", () => {
  assert.equal(
    buildLoadYoutubeVideosTaskDownloadUrl(["video-1", "video-2"]),
    "/comments/text?p=video-1%2Cvideo-2",
  );
});

test("resolveSuccessfulTaskDownloadUrl returns internal url for load_yt_videos2 tasks", () => {
  assert.equal(
    resolveSuccessfulTaskDownloadUrl(
      {
        payload: ["video-1", "video-2"],
        type: "load_yt_videos2",
      },
      {
        status: "SUCCESS",
      },
    ),
    "/comments/text?p=video-1%2Cvideo-2",
  );
});

test("resolveSuccessfulTaskDownloadUrl returns null for load_yt_videos2 tasks with invalid payload", () => {
  assert.equal(
    resolveSuccessfulTaskDownloadUrl(
      {
        payload: [],
        type: "load_yt_videos2",
      },
      {
        status: "SUCCESS",
      },
    ),
    null,
  );
});

test("resolveSuccessfulTaskDownloadUrl keeps download_url behavior for other task types", () => {
  assert.equal(
    resolveSuccessfulTaskDownloadUrl(
      {
        payload: null,
        type: null,
      },
      {
        result: {
          result: {
            download_url: "https://example.com/report.docx",
          },
        },
      },
    ),
    "https://example.com/report.docx",
  );
});
