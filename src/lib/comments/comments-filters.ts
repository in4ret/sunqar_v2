import { normalizeSearchQuery } from "@/lib/utils";

export type CommentPostFilter = {
  channel: string;
  contentId: string;
  source: string;
};

export type CommentsQueryInput = {
  from: string;
  posts: string[];
  query: string;
  to: string;
};

export type NormalizedCommentsQueryInput = {
  from: string;
  posts: string[];
  query: string;
  to: string;
};

type CommentsDateRange = {
  fromEpochSeconds: number | null;
  toEpochSeconds: number | null;
};

function escapeManticoreMatchValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function escapeSqlStringValue(value: string) {
  return value.replaceAll("'", "\\'");
}

export function encodeCommentPostFilterValue(post: CommentPostFilter) {
  return [
    `source:${encodeURIComponent(post.source.trim())}`,
    `channel:${encodeURIComponent(post.channel.trim())}`,
    `content-id:${encodeURIComponent(post.contentId.trim())}`,
  ].join("|");
}

export function decodeCommentPostFilterValue(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const segments = new Map<string, string>();

  for (const segment of trimmedValue.split("|")) {
    const separatorIndex = segment.indexOf(":");

    if (separatorIndex <= 0) {
      return null;
    }

    const key = segment.slice(0, separatorIndex);
    const encodedValue = segment.slice(separatorIndex + 1);

    try {
      segments.set(key, decodeURIComponent(encodedValue));
    } catch {
      return null;
    }
  }

  const source = segments.get("source")?.trim() ?? "";
  const channel = segments.get("channel")?.trim() ?? "";
  const contentId = segments.get("content-id")?.trim() ?? "";

  if (!source || !channel || !contentId) {
    return null;
  }

  return {
    channel,
    contentId,
    source,
  };
}

export function normalizeCommentsPosts(posts: string[]) {
  const normalizedValues = new Set<string>();

  for (const value of posts) {
    const normalizedPost = decodeCommentPostFilterValue(value);

    if (!normalizedPost) {
      continue;
    }

    normalizedValues.add(encodeCommentPostFilterValue(normalizedPost));
  }

  return [...normalizedValues].sort((left, right) => left.localeCompare(right, "en"));
}

export function normalizeCommentsEpochSecondsValue(value: string) {
  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const epochSeconds = Number(trimmedValue);

  if (!Number.isSafeInteger(epochSeconds) || epochSeconds < 0) {
    return null;
  }

  return epochSeconds;
}

export function normalizeCommentsDateRange(from: string, to: string): CommentsDateRange {
  const fromEpochSeconds = normalizeCommentsEpochSecondsValue(from);
  const toEpochSeconds = normalizeCommentsEpochSecondsValue(to);

  if (
    fromEpochSeconds !== null &&
    toEpochSeconds !== null &&
    fromEpochSeconds > toEpochSeconds
  ) {
    return {
      fromEpochSeconds: null,
      toEpochSeconds: null,
    };
  }

  return {
    fromEpochSeconds,
    toEpochSeconds,
  };
}

function buildPostsCondition(posts: CommentPostFilter[]) {
  const contentIdValues = [...new Set(
    posts
      .map((post) => post.contentId.trim())
      .filter(Boolean),
  )].map((contentId) => `'${escapeSqlStringValue(contentId)}'`);

  if (contentIdValues.length === 0) {
    return null;
  }

  return `content_id IN (${contentIdValues.join(", ")})`;
}

export function buildCommentsWhereClause(
  query: string,
  posts: string[],
  from: string,
  to: string,
  extraConditions: string[] = [],
) {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedPosts = normalizeCommentsPosts(posts);
  const { fromEpochSeconds, toEpochSeconds } = normalizeCommentsDateRange(from, to);
  const conditions: string[] = [];

  if (normalizedQuery) {
    conditions.push(`MATCH('${escapeManticoreMatchValue(normalizedQuery)}')`);
  }

  if (normalizedPosts.length > 0) {
    const decodedPosts = normalizedPosts
      .map((value) => decodeCommentPostFilterValue(value))
      .filter((post): post is CommentPostFilter => post !== null);
    const postsCondition = buildPostsCondition(decodedPosts);

    if (postsCondition) {
      conditions.push(`(${postsCondition})`);
    }
  }

  if (fromEpochSeconds !== null) {
    conditions.push(`publishedat >= ${fromEpochSeconds}`);
  }

  if (toEpochSeconds !== null) {
    conditions.push(`publishedat < ${toEpochSeconds + 60}`);
  }

  conditions.push(...extraConditions);

  if (conditions.length === 0) {
    return "";
  }

  return ` WHERE ${conditions.join(" AND ")}`;
}

export function normalizeCommentsQueryInput(input: CommentsQueryInput): NormalizedCommentsQueryInput {
  return {
    from: input.from.trim(),
    posts: normalizeCommentsPosts(input.posts),
    query: normalizeSearchQuery(input.query),
    to: input.to.trim(),
  };
}
