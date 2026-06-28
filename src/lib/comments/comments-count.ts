import "server-only";

import { unstable_cache } from "next/cache";

import { ONE_HOUR_REVALIDATE } from "@/lib/cache";
import {
  buildCommentsWhereClause,
  type CommentsQueryInput,
  normalizeCommentsQueryInput,
  type NormalizedCommentsQueryInput,
} from "@/lib/comments/comments-filters";
import { manticoreSql } from "@/lib/manticore";

type CountRow = {
  total: number | string;
};

async function getCommentsCount(input: NormalizedCommentsQueryInput) {
  const rows = await manticoreSql<CountRow>(
    `SELECT COUNT(*) AS total FROM comments${buildCommentsWhereClause(input.query, input.posts, input.from, input.to)}`,
  );

  return Number(rows[0]?.total ?? 0);
}

const getCachedCommentsCount = unstable_cache(
  async (query: string, serializedPosts: string, from: string, to: string) =>
    getCommentsCount({
      from,
      posts: serializedPosts ? serializedPosts.split("\u0000") : [],
      query,
      to,
    }),
  ["comments-count-v1"],
  {
    revalidate: ONE_HOUR_REVALIDATE,
    tags: ["comments:count"],
  },
);

export async function countComments(input: CommentsQueryInput) {
  const normalizedInput = normalizeCommentsQueryInput(input);

  return getCachedCommentsCount(
    normalizedInput.query,
    normalizedInput.posts.join("\u0000"),
    normalizedInput.from,
    normalizedInput.to,
  );
}
