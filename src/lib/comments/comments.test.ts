import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCommentsWhereClause,
  decodeCommentPostFilterValue,
  encodeCommentPostFilterValue,
  normalizeCommentsPosts,
  normalizeCommentsQueryInput,
} from "@/lib/comments/comments-filters";
import { buildCommentPostOptions } from "@/lib/comments/comments-post-options";
import {
  buildCommentsTableFilterConditions,
  normalizeCommentsTableFilters,
} from "@/lib/comments/comments-table";
import type { CommentsTableSort } from "@/lib/comments/comments-table.types";
import {
  buildCommentsTableOrderClause,
  normalizeCommentsTablePageSize,
  normalizeCommentsTableRow,
  normalizeCommentsTableSort,
} from "@/lib/comments/comments-table-shared";

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
    " WHERE (content_id IN ('video-7'))",
  );
});

test("buildCommentsWhereClause groups youtube post conditions with IN", () => {
  const youtubeValueA = encodeCommentPostFilterValue({
    channel: "channel-a",
    contentId: "video-7",
    source: "youtube",
  });
  const youtubeValueB = encodeCommentPostFilterValue({
    channel: "channel-b",
    contentId: "video-8",
    source: "youtube",
  });

  assert.equal(
    buildCommentsWhereClause("", [youtubeValueA, youtubeValueB], "", ""),
    " WHERE (content_id IN ('video-7', 'video-8'))",
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
    " WHERE (content_id IN ('https://www.instagram.com/p/example/', 'https://www.tiktok.com/@acct/video/1'))",
  );
});

test("buildCommentsWhereClause combines mixed-source post conditions with content_id IN", () => {
  const youtubeValue = encodeCommentPostFilterValue({
    channel: "ignored-channel",
    contentId: "video-7",
    source: "youtube",
  });
  const instagramValue = encodeCommentPostFilterValue({
    channel: "insta-channel",
    contentId: "https://www.instagram.com/p/example/",
    source: "ig",
  });

  assert.equal(
    buildCommentsWhereClause("", [youtubeValue, instagramValue], "", ""),
    " WHERE (content_id IN ('https://www.instagram.com/p/example/', 'video-7'))",
  );
});

test("buildCommentsWhereClause ignores invalid post values", () => {
  assert.equal(buildCommentsWhereClause("", ["bad-value"], "", ""), "");
});

test("buildCommentsWhereClause drops invalid reversed date range like news filters", () => {
  assert.equal(buildCommentsWhereClause("", [], "300", "200"), "");
});

test("normalizeCommentsTableFilters trims and fills defaults", () => {
  assert.deepEqual(
    normalizeCommentsTableFilters({
      callToActionFrom: " 0.1 ",
      comment: " hello ",
      likesTo: " 4 ",
      username: " alice ",
    }),
    {
      callToActionFrom: "0.1",
      callToActionTo: "",
      comment: "hello",
      likesFrom: "",
      likesTo: "4",
      threatFrom: "",
      threatTo: "",
      toxicFrom: "",
      toxicTo: "",
      username: "alice",
    },
  );
});

test("buildCommentsTableFilterConditions returns an empty list for empty filters", () => {
  assert.deepEqual(
    buildCommentsTableFilterConditions(
      normalizeCommentsTableFilters({}),
    ),
    [],
  );
});

test("buildCommentsTableFilterConditions builds text filters for comment and username", () => {
  const whereClause = buildCommentsWhereClause(
    '@comment "*hello*" @username "*Alice*"',
    [],
    "",
    "",
    buildCommentsTableFilterConditions(
      normalizeCommentsTableFilters({
        username: "Alice",
      }),
    ),
  );

  assert.equal(whereClause, ` WHERE MATCH('@comment "*hello*" @username "*Alice*"')`);
});

test("buildCommentsTableFilterConditions builds numeric ranges", () => {
  assert.deepEqual(
    buildCommentsTableFilterConditions(
      normalizeCommentsTableFilters({
        callToActionFrom: "0.1",
        callToActionTo: "0.9",
        likesFrom: "1",
        likesTo: "10",
        threatFrom: "0.2",
        threatTo: "0.8",
        toxicFrom: "0.3",
        toxicTo: "0.7",
      }),
    ),
    [
      "likes >= 1",
      "likes <= 10",
      "toxic >= 0.3",
      "toxic <= 0.7",
      "threat >= 0.2",
      "threat <= 0.8",
      "call_to_action >= 0.1",
      "call_to_action <= 0.9",
    ],
  );
});

test("buildCommentsTableFilterConditions ignores invalid numeric values", () => {
  assert.deepEqual(
    buildCommentsTableFilterConditions(
      normalizeCommentsTableFilters({
        likesFrom: "bad",
        likesTo: "10x",
        toxicFrom: "",
      }),
    ),
    [],
  );
});

test("buildCommentsTableFilterConditions drops reversed numeric ranges", () => {
  assert.deepEqual(
    buildCommentsTableFilterConditions(
      normalizeCommentsTableFilters({
        likesFrom: "10",
        likesTo: "1",
        toxicFrom: "0.9",
        toxicTo: "0.1",
      }),
    ),
    [],
  );
});

test("normalizeCommentsTablePageSize falls back to the default for unsupported values", () => {
  assert.equal(normalizeCommentsTablePageSize(10), 10);
  assert.equal(normalizeCommentsTablePageSize(999), 10);
});

test("normalizeCommentsTableSort accepts supported sort fields and rejects unsupported ones", () => {
  const validSort: CommentsTableSort = {
    direction: "asc",
    field: "publishedat",
  };

  assert.deepEqual(normalizeCommentsTableSort(validSort), validSort);
  assert.equal(
    normalizeCommentsTableSort({
      direction: "desc",
      field: "comment" as never,
    }),
    null,
  );
});

test("buildCommentsTableOrderClause falls back to publishedat desc when sort is invalid", () => {
  assert.equal(buildCommentsTableOrderClause(null), " ORDER BY publishedat DESC, id DESC");
  assert.equal(
    buildCommentsTableOrderClause({
      direction: "asc",
      field: "comment" as never,
    }),
    " ORDER BY publishedat DESC, id DESC",
  );
  assert.equal(
    buildCommentsTableOrderClause({
      direction: "desc",
      field: "content_id",
    }),
    " ORDER BY content_id DESC, id DESC",
  );
  assert.equal(
    buildCommentsTableOrderClause({
      direction: "desc",
      field: "likes",
    }),
    " ORDER BY likes DESC, id DESC",
  );
});

test("normalizeCommentsTableRow normalizes mixed Manticore value types", () => {
  assert.deepEqual(
    normalizeCommentsTableRow({
      call_to_action: "0",
      comment: "Comment text",
      comment_id: "comment-7",
      content_id: "post-42",
      likes: "4",
      publishedat: "1710000000",
      row_id: 123,
      source: "youtube",
      threat: 1,
      toxic: "2",
      username: "alice",
    }),
    {
      call_to_action: 0,
      comment: "Comment text",
      comment_id: "comment-7",
      content_id: "post-42",
      id: "123",
      likes: 4,
      publishedat: 1710000000,
      source: "youtube",
      threat: 1,
      toxic: 2,
      username: "alice",
    },
  );
});

test("normalizeCommentsTableRow returns null when required numeric values are invalid", () => {
  assert.equal(
    normalizeCommentsTableRow({
      call_to_action: "bad",
      comment: "Comment text",
      comment_id: "comment-7",
      content_id: "post-42",
      likes: "4",
      publishedat: "1710000000",
      row_id: 123,
      source: "youtube",
      threat: 1,
      toxic: "2",
      username: "alice",
    }),
    null,
  );
});

test("normalizeCommentsTableRow falls back to an empty content_id string", () => {
  assert.deepEqual(
    normalizeCommentsTableRow({
      call_to_action: 0,
      comment: "Comment text",
      comment_id: null,
      content_id: null,
      likes: 4,
      publishedat: 1710000000,
      row_id: 123,
      source: null,
      threat: 1,
      toxic: 2,
      username: "alice",
    }),
    {
      call_to_action: 0,
      comment: "Comment text",
      comment_id: "",
      content_id: "",
      id: "123",
      likes: 4,
      publishedat: 1710000000,
      source: "",
      threat: 1,
      toxic: 2,
      username: "alice",
    },
  );
});

test("buildCommentPostOptions limits youtube posts per channel to the latest 20", () => {
  const youtubePosts = Array.from({ length: 25 }, (_, index) => ({
    channel: "youtube-channel",
    channelName: "YouTube Channel",
    contentId: `video-${index + 1}`,
    contentTitle: `Video ${index + 1}`,
    publishedAt: `2026-01-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
    source: "youtube",
  }));

  const options = buildCommentPostOptions({
    emptyValue: "—",
    posts: youtubePosts,
  });

  assert.equal(options.length, 1);
  assert.equal(options[0]?.children?.length, 1);

  const channelOptions = options[0]?.children?.[0]?.children;

  assert.equal(channelOptions?.length, 20);
  assert.deepEqual(
    channelOptions?.map((option) => option.value),
    youtubePosts
      .slice()
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt, "en", { sensitivity: "base" }))
      .slice(0, 20)
      .map((post) =>
        encodeCommentPostFilterValue({
          channel: post.channel,
          contentId: post.contentId,
          source: post.source,
        }),
      ),
  );
});

test("buildCommentPostOptions keeps youtube posts without publishedAt after dated posts", () => {
  const posts = [
    ...Array.from({ length: 20 }, (_, index) => ({
      channel: "youtube-channel",
      channelName: "YouTube Channel",
      contentId: `dated-video-${index + 1}`,
      contentTitle: `Dated Video ${index + 1}`,
      publishedAt: `2026-02-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
      source: "youtube",
    })),
    {
      channel: "youtube-channel",
      channelName: "YouTube Channel",
      contentId: "undated-video",
      contentTitle: "Undated Video",
      publishedAt: null,
      source: "youtube",
    },
  ];

  const options = buildCommentPostOptions({
    emptyValue: "—",
    posts,
  });

  const channelOptions = options[0]?.children?.[0]?.children ?? [];

  assert.equal(channelOptions.length, 20);
  assert.equal(
    channelOptions.some((option) =>
      option.value ===
      encodeCommentPostFilterValue({
        channel: "youtube-channel",
        contentId: "undated-video",
        source: "youtube",
      }),
    ),
    false,
  );
});

test("buildCommentPostOptions does not limit non-youtube posts", () => {
  const posts = Array.from({ length: 25 }, (_, index) => ({
    channel: "instagram-channel",
    channelName: "Instagram Channel",
    contentId: `https://www.instagram.com/p/post-${index + 1}/`,
    contentTitle: `Instagram Post ${index + 1}`,
    publishedAt: null,
    source: "ig",
  }));

  const options = buildCommentPostOptions({
    emptyValue: "—",
    posts,
  });

  assert.equal(options[0]?.children?.[0]?.children?.length, 25);
});

test("buildCommentPostOptions applies youtube limits per channel independently", () => {
  const posts = [
    ...Array.from({ length: 22 }, (_, index) => ({
      channel: "youtube-channel-a",
      channelName: "YouTube Channel A",
      contentId: `channel-a-video-${index + 1}`,
      contentTitle: `Channel A Video ${index + 1}`,
      publishedAt: `2026-03-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
      source: "youtube",
    })),
    ...Array.from({ length: 21 }, (_, index) => ({
      channel: "youtube-channel-b",
      channelName: "YouTube Channel B",
      contentId: `channel-b-video-${index + 1}`,
      contentTitle: `Channel B Video ${index + 1}`,
      publishedAt: `2026-04-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
      source: "youtube",
    })),
  ];

  const options = buildCommentPostOptions({
    emptyValue: "—",
    posts,
  });

  const youtubeChannels = options[0]?.children ?? [];

  assert.equal(youtubeChannels.length, 2);
  assert.equal(youtubeChannels[0]?.children?.length, 20);
  assert.equal(youtubeChannels[1]?.children?.length, 20);
});
