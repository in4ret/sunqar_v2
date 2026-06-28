import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCommentsWhereClause,
  decodeCommentPostFilterValue,
  encodeCommentPostFilterValue,
  normalizeCommentsPosts,
  normalizeCommentsQueryInput,
} from "@/lib/comments/comments-filters";

test("encode and decode comment post filter values round-trip a post identity", () => {
  const encodedValue = encodeCommentPostFilterValue({
    channel: "@channel/name",
    contentId: "video?id=42",
    source: "youtube",
  });

  assert.deepEqual(decodeCommentPostFilterValue(encodedValue), {
    channel: "@channel/name",
    contentId: "video?id=42",
    source: "youtube",
  });
});

test("normalizeCommentsPosts trims, deduplicates, and drops malformed values", () => {
  const validValue = encodeCommentPostFilterValue({
    channel: "channel-1",
    contentId: "content-1",
    source: "ig",
  });

  assert.deepEqual(normalizeCommentsPosts([`  ${validValue}  `, validValue, "bad-value", ""]), [validValue]);
});

test("normalizeCommentsQueryInput normalizes query and selected posts", () => {
  const validValue = encodeCommentPostFilterValue({
    channel: "channel-1",
    contentId: "content-1",
    source: "tiktok",
  });

  assert.deepEqual(
    normalizeCommentsQueryInput({
      from: " 123 ",
      posts: [validValue, validValue],
      query: "  hello   world  ",
      to: " 456 ",
    }),
    {
      from: "123",
      posts: [validValue],
      query: "hello world",
      to: "456",
    },
  );
});

test("buildCommentsWhereClause returns query-only conditions", () => {
  assert.equal(
    buildCommentsWhereClause("hello world", [], "", ""),
    " WHERE MATCH('hello world')",
  );
});

test("buildCommentsWhereClause returns date-range-only conditions", () => {
  assert.equal(
    buildCommentsWhereClause("", [], "100", "200"),
    " WHERE publishedat >= 100 AND publishedat < 260",
  );
});

test("buildCommentsWhereClause adds youtube post conditions", () => {
  const youtubeValue = encodeCommentPostFilterValue({
    channel: "ignored-channel",
    contentId: "video-7",
    source: "youtube",
  });

  assert.equal(
    buildCommentsWhereClause("", [youtubeValue], "", ""),
    " WHERE ((source = 'youtube' AND content_id = 'video-7'))",
  );
});

test("buildCommentsWhereClause adds ig and tiktok post conditions", () => {
  const instagramValue = encodeCommentPostFilterValue({
    channel: "insta-channel",
    contentId: "https://www.instagram.com/p/example/",
    source: "ig",
  });
  const tiktokValue = encodeCommentPostFilterValue({
    channel: "@acct",
    contentId: "https://www.tiktok.com/@acct/video/1",
    source: "tiktok",
  });

  assert.equal(
    buildCommentsWhereClause("", [instagramValue, tiktokValue], "", ""),
    " WHERE ((source = 'ig' AND channel = 'insta-channel' AND content_id = 'https://www.instagram.com/p/example/') OR (source = 'tiktok' AND channel = '@acct' AND content_id = 'https://www.tiktok.com/@acct/video/1'))",
  );
});

test("buildCommentsWhereClause ignores invalid post values", () => {
  assert.equal(buildCommentsWhereClause("", ["bad-value"], "", ""), "");
});

test("buildCommentsWhereClause drops invalid reversed date range like news filters", () => {
  assert.equal(buildCommentsWhereClause("", [], "300", "200"), "");
});
