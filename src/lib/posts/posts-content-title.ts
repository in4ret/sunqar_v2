import { type RawCommentPostRow } from "@/lib/posts/posts-sync";

export const COMMENT_POST_CONTENT_TITLE_MAX_LENGTH = 160;
const COMMENT_POST_SCRAPE_CONCURRENCY = 5;
const COMMENT_POST_SCRAPE_TIMEOUT_MS = 10000;
const COMMENT_POST_USER_AGENT =
  "Mozilla/5.0 (compatible; SunqarBot/1.0; +https://sunqar.local/posts-sync)";

export type EnrichedCommentPostRow = RawCommentPostRow & {
  contentTitle?: string | null;
  ogUrl?: string | null;
};

export type ScrapedCommentPostMetadata = {
  contentTitle: string | null;
  ogUrl: string | null;
};

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  mdash: "-",
  nbsp: " ",
  ndash: "-",
  quot: '"',
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token: string) => {
    const normalizedToken = token.toLowerCase();

    if (normalizedToken.startsWith("#x")) {
      const codePoint = Number.parseInt(normalizedToken.slice(2), 16);

      return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint);
    }

    if (normalizedToken.startsWith("#")) {
      const codePoint = Number.parseInt(normalizedToken.slice(1), 10);

      return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint);
    }

    return HTML_ENTITY_MAP[normalizedToken] ?? entity;
  });
}

export function normalizeContentTitle(value: string) {
  const normalizedValue = decodeHtmlEntities(value)
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length <= COMMENT_POST_CONTENT_TITLE_MAX_LENGTH) {
    return normalizedValue;
  }

  return normalizedValue.slice(0, COMMENT_POST_CONTENT_TITLE_MAX_LENGTH).trimEnd();
}

function getMetaTagAttribute(tag: string, attributeName: string) {
  const attributePattern =
    /\b([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let attributeMatch = attributePattern.exec(tag);

  while (attributeMatch) {
    if (attributeMatch[1]?.toLowerCase() === attributeName) {
      return attributeMatch[3] ?? attributeMatch[4] ?? attributeMatch[5] ?? "";
    }

    attributeMatch = attributePattern.exec(tag);
  }

  return null;
}

function findMetaContent(html: string, attributeName: string, attributeValue: string) {
  const metaTagPattern = /<meta\b[^>]*>/gi;
  let metaTagMatch = metaTagPattern.exec(html);

  while (metaTagMatch) {
    const tag = metaTagMatch[0];
    const actualAttributeValue = getMetaTagAttribute(tag, attributeName);

    if (actualAttributeValue?.toLowerCase() === attributeValue.toLowerCase()) {
      const content = getMetaTagAttribute(tag, "content");

      if (content) {
        return content;
      }
    }

    metaTagMatch = metaTagPattern.exec(html);
  }

  return null;
}

export function extractInstagramChannelFromUrl(url: string) {
  const match = url.match(/^https:\/\/www\.instagram\.com\/([^/?#]+)\//i);

  return match?.[1] ?? null;
}

function extractJsonStringValues(input: string, keys: string[]) {
  const extractedValues: string[] = [];
  const pattern = new RegExp(
    `"(${keys.join("|")})"\\s*:\\s*("((?:\\\\.|[^"\\\\])*)")`,
    "gi",
  );
  let match = pattern.exec(input);

  while (match) {
    try {
      const parsedValue = JSON.parse(match[2] ?? '""');

      if (typeof parsedValue === "string") {
        extractedValues.push(parsedValue);
      }
    } catch {
      // Skip malformed JSON string fragments and keep scanning.
    }

    match = pattern.exec(input);
  }

  return extractedValues;
}

function findScriptContentDescription(html: string) {
  const scriptPattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch = scriptPattern.exec(html);

  while (scriptMatch) {
    const scriptContent = scriptMatch[1] ?? "";
    const candidates = extractJsonStringValues(scriptContent, [
      "description",
      "caption",
      "text",
    ]);

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeContentTitle(candidate);

      if (normalizedCandidate) {
        return normalizedCandidate;
      }
    }

    scriptMatch = scriptPattern.exec(html);
  }

  return null;
}

export function extractContentTitleFromHtml(html: string) {
  const candidates = [
    findMetaContent(html, "property", "og:description"),
    findMetaContent(html, "name", "description"),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalizedCandidate = normalizeContentTitle(candidate);

    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return findScriptContentDescription(html);
}

export function extractScrapedCommentPostMetadataFromHtml(
  html: string,
): ScrapedCommentPostMetadata {
  return {
    contentTitle: extractContentTitleFromHtml(html),
    ogUrl: findMetaContent(html, "property", "og:url"),
  };
}

export async function scrapeCommentPostMetadataFromUrl(
  url: string,
  fetchImpl: typeof fetch,
): Promise<ScrapedCommentPostMetadata | null> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, COMMENT_POST_SCRAPE_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      headers: {
        "user-agent": COMMENT_POST_USER_AGENT,
      },
      signal: abortController.signal,
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    return extractScrapedCommentPostMetadataFromHtml(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;

      nextIndex += 1;
      results[currentIndex] = await mapper(values[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => runWorker()),
  );

  return results;
}

export async function enrichCommentPostRows(
  rows: RawCommentPostRow[],
  fetchImpl: typeof fetch,
): Promise<EnrichedCommentPostRow[]> {
  return mapWithConcurrency(rows, COMMENT_POST_SCRAPE_CONCURRENCY, async (row) => {
    const source = row.source?.trim() ?? "";
    const contentId = row.content_id?.trim() ?? "";

    if (!contentId) {
      return {
        ...row,
        contentTitle: null,
      };
    }

    if (source === "tiktok") {
      return {
        ...row,
        contentTitle: contentId,
        ogUrl: null,
      };
    }

    const scrapedMetadata = await scrapeCommentPostMetadataFromUrl(contentId, fetchImpl);
    const instagramChannel =
      source === "ig" && scrapedMetadata?.ogUrl
        ? extractInstagramChannelFromUrl(scrapedMetadata.ogUrl)
        : null;

    return {
      ...row,
      channel: instagramChannel ?? row.channel,
      contentTitle: scrapedMetadata?.contentTitle ?? contentId,
      ogUrl: scrapedMetadata?.ogUrl ?? null,
    };
  });
}
