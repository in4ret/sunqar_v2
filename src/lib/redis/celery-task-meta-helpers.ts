import { routes } from "@/lib/routes";

export function normalizeLoadYoutubeVideosTaskPayload(payload: unknown) {
  if (!Array.isArray(payload)) {
    return [];
  }

  const normalizedValues = new Set<string>();

  for (const item of payload) {
    if (typeof item !== "string") {
      continue;
    }

    const normalizedValue = item.trim();

    if (!normalizedValue) {
      continue;
    }

    normalizedValues.add(normalizedValue);
  }

  return [...normalizedValues];
}

export function buildLoadYoutubeVideosTaskDownloadUrl(payload: unknown) {
  const contentIds = normalizeLoadYoutubeVideosTaskPayload(payload);

  if (contentIds.length === 0) {
    return null;
  }

  const nextUrl = new URL(routes.commentsText, "http://sunqar.local");

  nextUrl.searchParams.set("p", contentIds.join(","));

  return `${nextUrl.pathname}${nextUrl.search}`;
}

export function resolveSuccessfulTaskDownloadUrl(
  task: { payload: unknown; type: string | null },
  parsed: unknown,
) {
  if (task.type === "load_yt_videos2") {
    return buildLoadYoutubeVideosTaskDownloadUrl(task.payload);
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const parsedRecord = parsed as {
    result?: {
      download_url?: unknown;
      result?: {
        download_url?: unknown;
      };
    };
  };
  const downloadUrl =
    parsedRecord.result?.download_url ?? parsedRecord.result?.result?.download_url ?? null;

  return typeof downloadUrl === "string" && downloadUrl.trim() ? downloadUrl : null;
}
