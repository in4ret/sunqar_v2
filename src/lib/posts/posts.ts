import { asc, eq } from "drizzle-orm";

import { refreshCommentsPostOptionsCache } from "@/lib/comments";
import { db } from "@/lib/db/client";
import { type NewPost, posts, youtube } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { manticoreSql } from "@/lib/manticore";
import {
  enrichCommentPostRows,
  type EnrichedCommentPostRow,
} from "@/lib/posts/posts-content-title";
import {
  mapCommentRowToPost,
  mapYoutubeRowToPost,
  type RawCommentPostRow,
  syncPostsWithDependencies,
} from "@/lib/posts/posts-sync";
import { chunkValues, type RawYoutubeRow, type YoutubeMetadataUpdate, type YoutubeRow } from "@/lib/posts/posts-youtube";

const INSERT_POSTS_CHUNK_SIZE = 500;

function replaceYoutubeRowsInDatabase(rows: YoutubeRow[]) {
  db.transaction((tx) => {
    tx.delete(youtube).run();

    for (const chunk of chunkValues(rows, INSERT_POSTS_CHUNK_SIZE)) {
      tx.insert(youtube).values(chunk).run();
    }
  });
}

function applyYoutubeUpdatesInDatabase(updates: YoutubeMetadataUpdate[]) {
  db.transaction((tx) => {
    for (const update of updates) {
      tx.update(youtube)
        .set({
          channelId: update.channelId,
          channelTitle: update.channelTitle,
          publishedAt: update.publishedAt,
          contentTitle: update.contentTitle,
          status: update.status,
        })
        .where(eq(youtube.contentId, update.contentId))
        .run();
    }
  });
}

function rebuildPostsInDatabase(commentRows: EnrichedCommentPostRow[]) {
  const commentPostRows = commentRows
    .map(mapCommentRowToPost)
    .filter((row): row is NewPost => row !== null);
  const youtubePostRows = db
    .select()
    .from(youtube)
    .where(eq(youtube.status, "ok"))
    .all()
    .map(mapYoutubeRowToPost)
    .filter((row): row is NewPost => row !== null);
  const postRows = [...commentPostRows, ...youtubePostRows];

  db.transaction((tx) => {
    tx.delete(posts).run();

    for (const chunk of chunkValues(postRows, INSERT_POSTS_CHUNK_SIZE)) {
      tx.insert(posts).values(chunk).run();
    }
  });
}

export async function listPosts() {
  return db
    .select({
      channel: posts.channel,
      channelName: posts.channelName,
      contentId: posts.contentId,
      contentTitle: posts.contentTitle,
      id: posts.id,
      publishedAt: posts.publishedAt,
      source: posts.source,
    })
    .from(posts)
    .orderBy(asc(posts.source), asc(posts.channel), asc(posts.contentId))
    .all();
}

export async function syncPosts() {
  const res = await syncPostsWithDependencies({
    applyYoutubeUpdates: applyYoutubeUpdatesInDatabase,
    enrichCommentPostRows: (rows) => enrichCommentPostRows(rows, fetch),
    fetchImpl: fetch,
    loadCommentPostRows: () =>
      manticoreSql<RawCommentPostRow>(
        `SELECT source, channel, content_id FROM comments WHERE source IN ('ig', 'tiktok') GROUP BY source, channel, content_id LIMIT 1000000 OPTION max_matches=10000`,
      ),
    loadYoutubeRows: () =>
      manticoreSql<RawYoutubeRow>(
        `SELECT content_id FROM comments WHERE source = 'youtube' GROUP BY content_id LIMIT 1000000 OPTION max_matches=20000`,
      ),
    rebuildPosts: rebuildPostsInDatabase,
    replaceYoutubeRows: replaceYoutubeRowsInDatabase,
    youtubeApiKey: env.youtubeApiKey,
  });

  await refreshCommentsPostOptionsCache();

  return res;
}
