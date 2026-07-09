import assert from "node:assert/strict";
import test from "node:test";

import {
  encodeCommentPostFilterValue,
  mapYoutubeContentIdsToCommentPostFilterValues,
  normalizeCommentsTaskContentIdsParam,
} from "@/lib/comments/comments-filters";

test("normalizeCommentsTaskContentIdsParam splits comma-separated content ids, trims, and deduplicates", () => {
  assert.deepEqual(
    normalizeCommentsTaskContentIdsParam("video-1, video-2,video-1,,"),
    ["video-1", "video-2"],
  );
});

test("normalizeCommentsTaskContentIdsParam returns empty array for missing value", () => {
  assert.deepEqual(normalizeCommentsTaskContentIdsParam(undefined), []);
});

test("mapYoutubeContentIdsToCommentPostFilterValues resolves only existing youtube post values", () => {
  const youtubeValueA = encodeCommentPostFilterValue({
    channel: "channel-a",
    contentId: "video-1",
    source: "youtube",
  });
  const youtubeValueB = encodeCommentPostFilterValue({
    channel: "channel-b",
    contentId: "video-2",
    source: "youtube",
  });
  const tiktokValue = encodeCommentPostFilterValue({
    channel: "channel-c",
    contentId: "video-3",
    source: "tiktok",
  });

  assert.deepEqual(
    mapYoutubeContentIdsToCommentPostFilterValues(
      ["video-2", "video-1", "missing", "video-2"],
      [youtubeValueA, youtubeValueB, tiktokValue],
    ),
    [youtubeValueB, youtubeValueA],
  );
});
