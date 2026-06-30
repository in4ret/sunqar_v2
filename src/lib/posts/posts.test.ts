import assert from "node:assert/strict";
import test from "node:test";

import type { NewPost } from "@/lib/db/schema";
import {
  enrichCommentPostRows,
  extractContentTitleFromHtml,
  extractInstagramChannelFromUrl,
  extractScrapedCommentPostMetadataFromHtml,
  normalizeContentTitle,
} from "@/lib/posts/posts-content-title";
import {
  mapCommentRowToPost,
  mapYoutubeRowToPost,
  syncPostsWithDependencies,
} from "@/lib/posts/posts-sync";
import {
  chunkValues,
  formatYoutubePublishedAt,
  mapYoutubeVideoToMetadataUpdate,
  normalizeYoutubeRow,
  syncYoutubeRows,
} from "@/lib/posts/posts-youtube";

test("normalizeYoutubeRow trims valid content_id and skips empty values", () => {
  assert.deepEqual(normalizeYoutubeRow({ content_id: "  abc123  " }), {
    contentId: "abc123",
  });
  assert.equal(normalizeYoutubeRow({ content_id: "   " }), null);
  assert.equal(normalizeYoutubeRow({}), null);
});

test("mapYoutubeVideoToMetadataUpdate returns ok metadata when snippet is present", () => {
  assert.deepEqual(
    mapYoutubeVideoToMetadataUpdate("video-1", {
      id: "video-1",
      snippet: {
        channelId: "channel-1",
        channelTitle: "Channel title",
        publishedAt: "2026-06-28T09:05:00Z",
        title: "Video title",
      },
      status: {
        privacyStatus: "public",
      },
    }),
    {
      channelId: "channel-1",
      channelTitle: "Channel title",
      contentId: "video-1",
      publishedAt: "2026-06-28T09:05:00Z",
      contentTitle: "2026-06-28 14:05 Video title",
      status: "ok",
    },
  );
});

test("formatYoutubePublishedAt converts utc timestamp to Asia/Almaty time", () => {
  assert.equal(formatYoutubePublishedAt("2026-01-15T20:45:00Z"), "2026-01-16 01:45");
});

test("mapYoutubeVideoToMetadataUpdate returns not_found for missing items", () => {
  assert.deepEqual(mapYoutubeVideoToMetadataUpdate("missing-video"), {
    channelId: null,
    channelTitle: null,
    contentId: "missing-video",
    publishedAt: null,
    contentTitle: null,
    status: "not_found",
  });
});

test("mapYoutubeVideoToMetadataUpdate returns private when video is unavailable due to privacy", () => {
  assert.deepEqual(
    mapYoutubeVideoToMetadataUpdate("private-video", {
      id: "private-video",
      status: {
        privacyStatus: "private",
      },
    }),
    {
      channelId: null,
      channelTitle: null,
      contentId: "private-video",
      publishedAt: null,
      contentTitle: null,
      status: "private",
    },
  );
});

test("chunkValues splits arrays into batches of 50 for YouTube API usage", () => {
  const values = Array.from({ length: 101 }, (_, index) => `video-${index + 1}`);

  assert.deepEqual(
    chunkValues(values, 50).map((chunk) => chunk.length),
    [50, 50, 1],
  );
});

test("syncYoutubeRows deduplicates rows, batches API calls, and applies metadata updates", async () => {
  const storedRows = new Map<
    string,
    {
      channelId?: string | null;
      channelTitle?: string | null;
      contentId: string;
      publishedAt?: string | null;
      contentTitle?: string | null;
      status?: string | null;
    }
  >();
  const requestedIds: string[][] = [];

  const result = await syncYoutubeRows({
    applyYoutubeUpdates(updates) {
      for (const update of updates) {
        const existingRow = storedRows.get(update.contentId);

        storedRows.set(update.contentId, {
          ...existingRow,
          ...update,
        });
      }
    },
    fetchImpl: async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      const parsedUrl = new URL(url);
      const ids = (parsedUrl.searchParams.get("id") ?? "").split(",").filter(Boolean);

      requestedIds.push(ids);

      const items = ids
        .filter((id) => id !== "video-2")
        .map((id) => ({
          id,
          snippet:
            id === "video-3"
              ? undefined
              : {
                  channelId: `channel-for-${id}`,
                  channelTitle: `Channel for ${id}`,
                  publishedAt: `2026-06-${String(ids.indexOf(id) + 1).padStart(2, "0")}T09:05:00Z`,
                  title: `Title for ${id}`,
                },
          status:
            id === "video-3"
              ? {
                  privacyStatus: "private",
                }
              : {
                  privacyStatus: "public",
                },
        }));

      return new Response(JSON.stringify({ items }), {
        status: 200,
      });
    },
    loadYoutubeRows: async () => [
      { content_id: "video-1" },
      { content_id: "video-2" },
      { content_id: "video-3" },
      { content_id: "video-1" },
      ...Array.from({ length: 50 }, (_, index) => ({
        content_id: `extra-video-${index + 1}`,
      })),
    ],
    replaceYoutubeRows(rows) {
      storedRows.clear();

      for (const row of rows) {
        storedRows.set(row.contentId, { contentId: row.contentId });
      }
    },
    youtubeApiKey: "test-key",
  });

  assert.equal(result.insertedCount, 53);
  assert.deepEqual(
    requestedIds.map((batch) => batch.length),
    [50, 3],
  );
  assert.deepEqual(storedRows.get("video-1"), {
    channelId: "channel-for-video-1",
    channelTitle: "Channel for video-1",
    contentId: "video-1",
    publishedAt: "2026-06-01T09:05:00Z",
    contentTitle: "2026-06-01 14:05 Title for video-1",
    status: "ok",
  });
  assert.deepEqual(storedRows.get("video-2"), {
    channelId: null,
    channelTitle: null,
    contentId: "video-2",
    publishedAt: null,
    contentTitle: null,
    status: "not_found",
  });
  assert.deepEqual(storedRows.get("video-3"), {
    channelId: null,
    channelTitle: null,
    contentId: "video-3",
    publishedAt: null,
    contentTitle: null,
    status: "private",
  });
});

test("syncYoutubeRows marks an entire batch as error when the API request fails", async () => {
  const storedRows = new Map<
    string,
    {
      channelId?: string | null;
      channelTitle?: string | null;
      contentId: string;
      publishedAt?: string | null;
      contentTitle?: string | null;
      status?: string | null;
    }
  >();

  await syncYoutubeRows({
    applyYoutubeUpdates(updates) {
      for (const update of updates) {
        const existingRow = storedRows.get(update.contentId);

        storedRows.set(update.contentId, {
          ...existingRow,
          ...update,
        });
      }
    },
    fetchImpl: async () =>
      new Response("upstream failure", {
        status: 500,
      }),
    loadYoutubeRows: async () => [{ content_id: "video-1" }, { content_id: "video-2" }],
    replaceYoutubeRows(rows) {
      storedRows.clear();

      for (const row of rows) {
        storedRows.set(row.contentId, { contentId: row.contentId });
      }
    },
    youtubeApiKey: "test-key",
  });

  assert.deepEqual(storedRows.get("video-1"), {
    channelId: null,
    channelTitle: null,
    contentId: "video-1",
    publishedAt: null,
    contentTitle: null,
    status: "error",
  });
  assert.deepEqual(storedRows.get("video-2"), {
    channelId: null,
    channelTitle: null,
    contentId: "video-2",
    publishedAt: null,
    contentTitle: null,
    status: "error",
  });
});

test("mapYoutubeRowToPost maps ok youtube rows into post rows", () => {
  assert.deepEqual(
    mapYoutubeRowToPost({
      channelId: "channel-1",
      channelTitle: "Channel 1",
      contentId: "video-1",
      contentTitle: "2026-06-28 14:05 Video 1",
      publishedAt: "2026-06-28T09:05:00Z",
      status: "ok",
    }),
    {
      channel: "channel-1",
      channelName: "Channel 1",
      contentId: "video-1",
      contentTitle: "2026-06-28 14:05 Video 1",
      id: "youtube:channel-1:video-1",
      publishedAt: "2026-06-28T09:05:00Z",
      source: "youtube",
    },
  );
});

test("mapYoutubeRowToPost skips non-ok youtube rows", () => {
  assert.equal(
    mapYoutubeRowToPost({
      channelId: null,
      channelTitle: null,
      contentId: "video-1",
      contentTitle: null,
      publishedAt: null,
      status: "private",
    }),
    null,
  );
});

test("extractContentTitleFromHtml reads og:description", () => {
  assert.equal(
    extractContentTitleFromHtml(
      '<html><head><meta property="og:description" content="Caption from og"></head></html>',
    ),
    "Caption from og",
  );
});

test("extractContentTitleFromHtml falls back to meta description", () => {
  assert.equal(
    extractContentTitleFromHtml(
      '<html><head><meta name="description" content="Caption from description"></head></html>',
    ),
    "Caption from description",
  );
});

test("extractContentTitleFromHtml extracts caption from script payload", () => {
  assert.equal(
    extractContentTitleFromHtml(
      '<html><body><script>window.__DATA__={"caption":"Caption from script payload"}</script></body></html>',
    ),
    "Caption from script payload",
  );
});

test("extractScrapedCommentPostMetadataFromHtml reads og:url", () => {
  assert.deepEqual(
    extractScrapedCommentPostMetadataFromHtml(
      '<html><head><meta property="og:url" content="https://www.instagram.com/budarov_anton/reel/DY4d5yfMvOR/"><meta property="og:description" content="Caption from og"></head></html>',
    ),
    {
      contentTitle: "Caption from og",
      ogUrl: "https://www.instagram.com/budarov_anton/reel/DY4d5yfMvOR/",
    },
  );
});

test("extractInstagramChannelFromUrl returns instagram username from og:url", () => {
  assert.equal(
    extractInstagramChannelFromUrl("https://www.instagram.com/budarov_anton/reel/DY4d5yfMvOR/"),
    "budarov_anton",
  );
});

test("normalizeContentTitle trims, decodes entities, and collapses whitespace", () => {
  assert.equal(
    normalizeContentTitle("  Hello&nbsp;&amp;   world \n from \t post  "),
    "Hello & world from post",
  );
});

test("normalizeContentTitle truncates content to 160 characters", () => {
  const input = "a".repeat(200);
  const normalizedTitle = normalizeContentTitle(input);

  assert.equal(normalizedTitle?.length, 160);
  assert.equal(normalizedTitle, "a".repeat(160));
});

test("normalizeContentTitle returns null for empty normalized content", () => {
  assert.equal(normalizeContentTitle(" \n\t&nbsp; "), null);
});

test("enrichCommentPostRows falls back to contentId when scraping fails", async () => {
  const rows = await enrichCommentPostRows(
    [
      {
        channel: "channel",
        content_id: "https://www.instagram.com/p/example/",
        source: "ig",
      },
    ],
    async () =>
      new Response("upstream failure", {
        status: 500,
      }),
  );

  assert.deepEqual(rows, [
    {
      channel: "channel",
      contentTitle: "https://www.instagram.com/p/example/",
      content_id: "https://www.instagram.com/p/example/",
      ogUrl: null,
      source: "ig",
    },
  ]);
});

test("enrichCommentPostRows duplicates contentId for tiktok", async () => {
  const rows = await enrichCommentPostRows(
    [
      {
        channel: "pkzsk.news",
        content_id: "https://www.tiktok.com/@pkzsk.news/video/1",
        source: "tiktok",
      },
    ],
    async () =>
      new Response(
        '<html><head><title>TikTok title from page</title><meta property="og:description" content="Ignored"></head></html>',
        {
          status: 200,
        },
      ),
  );

  assert.deepEqual(rows, [
    {
      channel: "pkzsk.news",
      contentTitle: "https://www.tiktok.com/@pkzsk.news/video/1",
      content_id: "https://www.tiktok.com/@pkzsk.news/video/1",
      ogUrl: null,
      source: "tiktok",
    },
  ]);
});

test("enrichCommentPostRows rewrites instagram channel from og:url", async () => {
  const rows = await enrichCommentPostRows(
    [
      {
        channel: "channel",
        content_id: "https://www.instagram.com/p/example/",
        source: "ig",
      },
    ],
    async () =>
      new Response(
        '<html><head><meta property="og:url" content="https://www.instagram.com/budarov_anton/reel/DY4d5yfMvOR/"><meta property="og:description" content="Instagram post snippet"></head></html>',
        {
          status: 200,
        },
      ),
  );

  assert.deepEqual(rows, [
    {
      channel: "budarov_anton",
      contentTitle: "Instagram post snippet",
      content_id: "https://www.instagram.com/p/example/",
      ogUrl: "https://www.instagram.com/budarov_anton/reel/DY4d5yfMvOR/",
      source: "ig",
    },
  ]);
});

test("mapCommentRowToPost maps resolved instagram channel", () => {
  assert.deepEqual(
    mapCommentRowToPost({
      channel: "budarov_anton",
      contentTitle: "Instagram post snippet",
      content_id: "https://www.instagram.com/p/example/",
      ogUrl: "https://www.instagram.com/budarov_anton/reel/DY4d5yfMvOR/",
      source: "ig",
    }),
    {
      channel: "budarov_anton",
      channelName: "budarov_anton",
      contentId: "https://www.instagram.com/p/example/",
      contentTitle: "Instagram post snippet",
      id: "ig:budarov_anton:https://www.instagram.com/p/example/",
      publishedAt: null,
      source: "ig",
    },
  );
});

test("mapCommentRowToPost uses tiktok channel as channelName", () => {
  assert.deepEqual(
    mapCommentRowToPost({
      channel: "pkzsk.news",
      contentTitle: "TikTok post snippet",
      content_id: "video-1",
      ogUrl: null,
      source: "tiktok",
    }),
    {
      channel: "pkzsk.news",
      channelName: "pkzsk.news",
      contentId: "video-1",
      contentTitle: "TikTok post snippet",
      id: "tiktok:pkzsk.news:video-1",
      publishedAt: null,
      source: "tiktok",
    },
  );
});

test("mapCommentRowToPost falls back to channel value for other sources", () => {
  assert.deepEqual(
    mapCommentRowToPost({
      channel: "news-channel",
      contentTitle: "Fallback snippet",
      content_id: "post-1",
      ogUrl: null,
      source: "ig",
    }),
    {
      channel: "news-channel",
      channelName: "news-channel",
      contentId: "post-1",
      contentTitle: "Fallback snippet",
      id: "ig:news-channel:post-1",
      publishedAt: null,
      source: "ig",
    },
  );
});

test("syncPostsWithDependencies rebuilds posts from comment rows and ok youtube rows after sync", async () => {
  const youtubeRows = new Map<
    string,
    {
      channelId?: string | null;
      channelTitle?: string | null;
      contentId: string;
      publishedAt?: string | null;
      contentTitle?: string | null;
      status?: string | null;
    }
  >();
  const postsRows: NewPost[] = [
    {
      channel: "legacy-channel",
      channelName: "Legacy Channel",
      contentId: "legacy-video",
      contentTitle: "Legacy Video",
      id: "legacy-id",
      source: "legacy",
    },
  ];

  const result = await syncPostsWithDependencies({
    applyYoutubeUpdates(updates) {
      for (const update of updates) {
        const existingRow = youtubeRows.get(update.contentId);

        youtubeRows.set(update.contentId, {
          ...existingRow,
          ...update,
        });
      }
    },
    fetchImpl: async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      const parsedUrl = new URL(url);
      const ids = (parsedUrl.searchParams.get("id") ?? "").split(",").filter(Boolean);
      const items = ids
        .filter((id) => id !== "video-2")
        .map((id) => ({
          id,
          snippet:
            id === "video-3"
              ? undefined
              : {
                  channelId: `channel-for-${id}`,
                  channelTitle: `Channel for ${id}`,
                  publishedAt: `2026-06-${String(ids.indexOf(id) + 1).padStart(2, "0")}T09:05:00Z`,
                  title: `Title for ${id}`,
                },
          status:
            id === "video-3"
              ? {
                  privacyStatus: "private",
                }
              : {
                  privacyStatus: "public",
                },
        }));

      return new Response(JSON.stringify({ items }), {
        status: 200,
      });
    },
    enrichCommentPostRows: async (rows) =>
      rows.map((row) => ({
        ...row,
        channel: row.source === "ig" ? "budarov_anton" : row.channel,
        contentTitle: row.source === "ig" ? "Instagram snippet" : row.content_id ?? null,
        ogUrl:
          row.source === "ig"
            ? "https://www.instagram.com/budarov_anton/reel/DY4d5yfMvOR/"
            : null,
      })),
    loadCommentPostRows: async () => [
      {
        channel: "channel",
        content_id: "https://www.instagram.com/p/example/",
        source: "ig",
      },
      {
        channel: "pkzsk.news",
        content_id: "video-77",
        source: "tiktok",
      },
      {
        channel: "other-channel",
        content_id: "video-88",
        source: "tiktok",
      },
    ],
    loadYoutubeRows: async () => [
      { content_id: "video-1" },
      { content_id: "video-2" },
      { content_id: "video-3" },
      { content_id: "video-1" },
    ],
    rebuildPosts(commentRows) {
      postsRows.length = 0;

      for (const row of commentRows) {
        const postRow = mapCommentRowToPost(row);

        if (postRow) {
          postsRows.push(postRow);
        }
      }

      for (const row of youtubeRows.values()) {
        const postRow = mapYoutubeRowToPost({
          channelId: row.channelId ?? null,
          channelTitle: row.channelTitle ?? null,
          contentId: row.contentId,
          contentTitle: row.contentTitle ?? null,
          publishedAt: row.publishedAt ?? null,
          status:
            row.status === "ok" ||
            row.status === "not_found" ||
            row.status === "private" ||
            row.status === "deleted" ||
            row.status === "error"
              ? row.status
              : null,
        });

        if (postRow) {
          postsRows.push(postRow);
        }
      }
    },
    replaceYoutubeRows(rows) {
      youtubeRows.clear();

      for (const row of rows) {
        youtubeRows.set(row.contentId, { contentId: row.contentId });
      }
    },
    youtubeApiKey: "test-key",
  });

  assert.equal(result.insertedCount, 3);
  assert.deepEqual(postsRows, [
    {
      channel: "budarov_anton",
      channelName: "budarov_anton",
      contentId: "https://www.instagram.com/p/example/",
      contentTitle: "Instagram snippet",
      id: "ig:budarov_anton:https://www.instagram.com/p/example/",
      publishedAt: null,
      source: "ig",
    },
    {
      channel: "pkzsk.news",
      channelName: "pkzsk.news",
      contentId: "video-77",
      contentTitle: "video-77",
      id: "tiktok:pkzsk.news:video-77",
      publishedAt: null,
      source: "tiktok",
    },
    {
      channel: "other-channel",
      channelName: "other-channel",
      contentId: "video-88",
      contentTitle: "video-88",
      id: "tiktok:other-channel:video-88",
      publishedAt: null,
      source: "tiktok",
    },
    {
      channel: "channel-for-video-1",
      channelName: "Channel for video-1",
      contentId: "video-1",
      contentTitle: "2026-06-01 14:05 Title for video-1",
      id: "youtube:channel-for-video-1:video-1",
      publishedAt: "2026-06-01T09:05:00Z",
      source: "youtube",
    },
  ]);
});

test("syncPostsWithDependencies keeps comment-based posts when no youtube rows are loaded", async () => {
  const postsRows: NewPost[] = [
    {
      channel: "legacy-channel",
      channelName: "Legacy Channel",
      contentId: "legacy-video",
      contentTitle: "Legacy Video",
      id: "legacy-id",
      source: "legacy",
    },
  ];

  const result = await syncPostsWithDependencies({
    applyYoutubeUpdates() {},
    enrichCommentPostRows: async (rows) =>
      rows.map((row) => ({
        ...row,
        contentTitle: row.content_id ?? null,
        ogUrl: null,
      })),
    fetchImpl: async () =>
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
      }),
    loadCommentPostRows: async () => [
      {
        channel: "channel",
        content_id: "https://www.instagram.com/p/example/",
        source: "ig",
      },
    ],
    loadYoutubeRows: async () => [],
    rebuildPosts(commentRows) {
      postsRows.length = 0;

      for (const row of commentRows) {
        const postRow = mapCommentRowToPost(row);

        if (postRow) {
          postsRows.push(postRow);
        }
      }
    },
    replaceYoutubeRows() {},
    youtubeApiKey: "test-key",
  });

  assert.equal(result.insertedCount, 0);
  assert.deepEqual(postsRows, [
    {
      channel: "channel",
      channelName: "channel",
      contentId: "https://www.instagram.com/p/example/",
      contentTitle: "https://www.instagram.com/p/example/",
      id: "ig:channel:https://www.instagram.com/p/example/",
      publishedAt: null,
      source: "ig",
    },
  ]);
});
