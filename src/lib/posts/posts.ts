import { asc } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { posts, youtube } from "@/lib/db/schema";
import { manticoreSql } from "@/lib/manticore";

type RawYoutubeRow = {
  content_id?: string | null;
};

const SYNC_POSTS_TIMER_LABEL = "syncPosts";
const INSERT_POSTS_CHUNK_SIZE = 500;

function normalizeYoutubeRow(row: RawYoutubeRow) {
  const contentId = row.content_id?.trim() ?? "";

  if (!contentId) {
    return null;
  }

  return {
    contentId,
  };
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

export async function listPosts() {
  return db
    .select({
      channel: posts.channel,
      channelName: posts.channelName,
      contentId: posts.contentId,
      contentTitle: posts.contentTitle,
      id: posts.id,
      source: posts.source,
    })
    .from(posts)
    .orderBy(asc(posts.source), asc(posts.channel), asc(posts.contentId))
    .all();
}

export async function syncPosts() {
  console.time(SYNC_POSTS_TIMER_LABEL);

  try {
    const rows = await manticoreSql<RawYoutubeRow>(
      `SELECT content_id FROM comments WHERE source = 'youtube' GROUP BY content_id LIMIT 1000000 OPTION max_matches=300000`,
    );
    const uniqueYoutubeRows = Array.from(
      new Map(
        rows
          .map(normalizeYoutubeRow)
          .filter((row): row is NonNullable<typeof row> => row !== null)
          .map((row) => [row.contentId, row]),
      ).values(),
    );
    db.transaction((tx) => {
      tx.delete(youtube).run();

      for (const chunk of chunkValues(uniqueYoutubeRows, INSERT_POSTS_CHUNK_SIZE)) {
        tx.insert(youtube).values(chunk).run();
      }
    });

    return { insertedCount: uniqueYoutubeRows.length };
  } finally {
    console.timeEnd(SYNC_POSTS_TIMER_LABEL);
  }
}
