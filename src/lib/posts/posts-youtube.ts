import type { NewPost } from "@/lib/db/schema";

type YoutubeApiVideoItem = {
  id?: string;
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    title?: string;
  };
  status?: {
    privacyStatus?: string;
    uploadStatus?: string;
  };
};

type YoutubeVideosApiResponse = {
  items?: YoutubeApiVideoItem[];
};

export type RawYoutubeRow = {
  content_id?: string | null;
};

export type YoutubeRow = {
  contentId: string;
};

export type YoutubeMetadataUpdate = {
  channelId: string | null;
  channelTitle: string | null;
  contentId: string;
  publishedAt: string | null;
  contentTitle: string | null;
  status: "deleted" | "error" | "not_found" | "ok" | "private";
};

type SyncYoutubeRowsDependencies = {
  applyYoutubeUpdates: (updates: YoutubeMetadataUpdate[]) => void;
  fetchImpl: typeof fetch;
  loadYoutubeRows: () => Promise<RawYoutubeRow[]>;
  replaceYoutubeRows: (rows: YoutubeRow[]) => void;
  youtubeApiKey: string;
};

const YOUTUBE_API_CHUNK_SIZE = 50;
const YOUTUBE_VIDEOS_API_URL = "https://www.googleapis.com/youtube/v3/videos";
const ALMATY_TIME_ZONE = "Asia/Almaty";
const YOUTUBE_URL_SPLIT_PATTERN = /[\s,]+/;
const youtubePublishedAtFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "2-digit",
  timeZone: ALMATY_TIME_ZONE,
  year: "numeric",
});

export function formatYoutubePublishedAt(publishedAt: string) {
  const publishedDate = new Date(publishedAt);

  if (Number.isNaN(publishedDate.getTime())) {
    return null;
  }

  const parts = youtubePublishedAtFormatter.formatToParts(publishedDate);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  if (!year || !month || !day || !hour || !minute) {
    return null;
  }

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function normalizeYoutubeRow(row: RawYoutubeRow) {
  const contentId = row.content_id?.trim() ?? "";

  if (!contentId) {
    return null;
  }

  return {
    contentId,
  };
}

export function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

export function parseYoutubeUploadInput(input: string) {
  return input
    .split(YOUTUBE_URL_SPLIT_PATTERN)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function extractYoutubeContentIdFromUrl(input: string) {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedInput);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

  if (hostname === "youtu.be") {
    const contentId = parsedUrl.pathname.split("/").filter(Boolean)[0]?.trim() ?? "";

    return contentId || null;
  }

  if (hostname !== "youtube.com" && hostname !== "m.youtube.com") {
    return null;
  }

  if (parsedUrl.pathname === "/watch") {
    const contentId = parsedUrl.searchParams.get("v")?.trim() ?? "";

    return contentId || null;
  }

  const [firstPathSegment, secondPathSegment] = parsedUrl.pathname.split("/").filter(Boolean);

  if ((firstPathSegment === "shorts" || firstPathSegment === "live") && secondPathSegment) {
    const contentId = secondPathSegment.trim();

    return contentId || null;
  }

  return null;
}

export function mapYoutubeVideoToMetadataUpdate(
  contentId: string,
  item?: YoutubeApiVideoItem,
): YoutubeMetadataUpdate {
  const normalizedContentId = contentId.trim();

  if (!item) {
    return {
      channelId: null,
      channelTitle: null,
      contentId: normalizedContentId,
      publishedAt: null,
      contentTitle: null,
      status: "not_found",
    };
  }

  const snippet = item.snippet;
  const formattedPublishedAt =
    typeof snippet?.publishedAt === "string" ? formatYoutubePublishedAt(snippet.publishedAt) : null;

  if (snippet?.channelId && snippet.title && snippet.channelTitle && snippet.publishedAt && formattedPublishedAt) {
    return {
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
      contentId: normalizedContentId,
      publishedAt: snippet.publishedAt,
      contentTitle: `${formattedPublishedAt} ${snippet.title}`,
      status: "ok",
    };
  }

  if (item.status?.uploadStatus === "deleted") {
    return {
      channelId: null,
      channelTitle: null,
      contentId: normalizedContentId,
      publishedAt: null,
      contentTitle: null,
      status: "deleted",
    };
  }

  if (item.status?.privacyStatus === "private") {
    return {
      channelId: null,
      channelTitle: null,
      contentId: normalizedContentId,
      publishedAt: null,
      contentTitle: null,
      status: "private",
    };
  }

  return {
    channelId: null,
    channelTitle: null,
    contentId: normalizedContentId,
    publishedAt: null,
    contentTitle: null,
    status: "error",
  };
}

export function mapYoutubeMetadataUpdateToPost(update: YoutubeMetadataUpdate): NewPost | null {
  if (update.status !== "ok" || !update.channelId || !update.contentId) {
    return null;
  }

  return {
    channel: update.channelId,
    channelName: update.channelTitle,
    contentId: update.contentId,
    contentTitle: update.contentTitle,
    id: `youtube:${update.channelId}:${update.contentId}`,
    publishedAt: update.publishedAt,
    source: "youtube",
  };
}

function createYoutubeErrorUpdates(contentIds: string[]) {
  return contentIds.map((contentId) => ({
    channelId: null,
    channelTitle: null,
    contentId,
    publishedAt: null,
    contentTitle: null,
    status: "error" as const,
  }));
}

async function fetchYoutubeMetadataBatch(
  contentIds: string[],
  youtubeApiKey: string,
  fetchImpl: typeof fetch,
) {
  const searchParams = new URLSearchParams({
    id: contentIds.join(","),
    key: youtubeApiKey,
    part: "snippet,status",
  });

  const response = await fetchImpl(`${YOUTUBE_VIDEOS_API_URL}?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(`YouTube API error ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as YoutubeVideosApiResponse;
  const itemsById = new Map(
    (payload.items ?? [])
      .filter((item): item is YoutubeApiVideoItem & { id: string } => typeof item.id === "string")
      .map((item) => [item.id, item]),
  );

  return contentIds.map((contentId) => mapYoutubeVideoToMetadataUpdate(contentId, itemsById.get(contentId)));
}

export async function fetchYoutubeMetadata(
  contentIds: string[],
  youtubeApiKey: string,
  fetchImpl: typeof fetch,
) {
  const updates: YoutubeMetadataUpdate[] = [];

  for (const chunk of chunkValues(contentIds, YOUTUBE_API_CHUNK_SIZE)) {
    try {
      const batchUpdates = await fetchYoutubeMetadataBatch(chunk, youtubeApiKey, fetchImpl);

      updates.push(...batchUpdates);
    } catch {
      updates.push(...createYoutubeErrorUpdates(chunk));
    }
  }

  return updates;
}

export async function syncYoutubeRows({
  applyYoutubeUpdates,
  fetchImpl,
  loadYoutubeRows,
  replaceYoutubeRows,
  youtubeApiKey,
}: SyncYoutubeRowsDependencies) {
  const rows = await loadYoutubeRows();
  const uniqueYoutubeRows = Array.from(
    new Map(
      rows
        .map(normalizeYoutubeRow)
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .map((row) => [row.contentId, row]),
    ).values(),
  );

  if (!youtubeApiKey) {
    throw new Error("YOUTUBE_API_KEY is not set.");
  }

  replaceYoutubeRows(uniqueYoutubeRows);

  if (uniqueYoutubeRows.length > 0) {
    const metadataUpdates = await fetchYoutubeMetadata(
      uniqueYoutubeRows.map((row) => row.contentId),
      youtubeApiKey,
      fetchImpl,
    );

    applyYoutubeUpdates(metadataUpdates);
  }

  return { insertedCount: uniqueYoutubeRows.length };
}
