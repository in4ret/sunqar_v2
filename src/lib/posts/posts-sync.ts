import { type NewPost, type Youtube } from "@/lib/db/schema";
import { type EnrichedCommentPostRow } from "@/lib/posts/posts-content-title";
import {
  type RawYoutubeRow,
  syncYoutubeRows,
  type YoutubeMetadataUpdate,
  type YoutubeRow,
} from "@/lib/posts/posts-youtube";

export type RawCommentPostRow = {
  channel?: string | null;
  content_id?: string | null;
  source?: string | null;
};

export type SyncPostsDependencies = {
  applyYoutubeUpdates: (updates: YoutubeMetadataUpdate[]) => void;
  enrichCommentPostRows: (rows: RawCommentPostRow[]) => Promise<EnrichedCommentPostRow[]>;
  fetchImpl: typeof fetch;
  loadCommentPostRows: () => Promise<RawCommentPostRow[]>;
  loadYoutubeRows: () => Promise<RawYoutubeRow[]>;
  rebuildPosts: (commentRows: EnrichedCommentPostRow[]) => void;
  replaceYoutubeRows: (rows: YoutubeRow[]) => void;
  youtubeApiKey: string;
};

export function createPostId(source: string, channel: string, contentId: string) {
  return `${source}:${channel}:${contentId}`;
}

export function mapCommentRowToPost(row: EnrichedCommentPostRow): NewPost | null {
  const source = row.source?.trim() ?? "";
  const channel = row.channel?.trim() ?? "";
  const contentId = row.content_id?.trim() ?? "";
  const contentTitle = row.contentTitle?.trim() || contentId;

  if (!source || !channel || !contentId) {
    return null;
  }

  return {
    channel,
    channelName: channel,
    contentId,
    contentTitle,
    id: createPostId(source, channel, contentId),
    source,
  };
}

export function mapYoutubeRowToPost(row: Youtube): NewPost | null {
  if (row.status !== "ok" || !row.channelId || !row.contentId) {
    return null;
  }

  return {
    channel: row.channelId,
    channelName: row.channelTitle,
    contentId: row.contentId,
    contentTitle: row.contentTitle,
    id: createPostId("youtube", row.channelId, row.contentId),
    source: "youtube",
  };
}

export async function syncPostsWithDependencies({
  applyYoutubeUpdates,
  enrichCommentPostRows,
  fetchImpl,
  loadCommentPostRows,
  loadYoutubeRows,
  rebuildPosts,
  replaceYoutubeRows,
  youtubeApiKey,
}: SyncPostsDependencies) {
  const result = await syncYoutubeRows({
    applyYoutubeUpdates,
    fetchImpl,
    loadYoutubeRows,
    replaceYoutubeRows,
    youtubeApiKey,
  });

  const commentRows = await loadCommentPostRows();
  const enrichedCommentRows = await enrichCommentPostRows(commentRows);
  rebuildPosts(enrichedCommentRows);

  return result;
}
