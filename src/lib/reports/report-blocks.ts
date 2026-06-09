const reportBlockKeys = ["title", "aiModel", "prompt", "sources", "keywords", "from", "to"] as const;

export type ReportBlock = {
  title: string;
  aiModel: string;
  prompt: string;
  sources: string[];
  keywords: string[];
  from: number | null;
  to: number | null;
};

export type ReportBlocks = [ReportBlock, ...ReportBlock[]];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const valueKeys = Object.keys(value);

  return (
    valueKeys.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableTimestamp(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

export function isReportBlock(value: unknown): value is ReportBlock {
  if (!isRecord(value) || !hasExactKeys(value, reportBlockKeys)) {
    return false;
  }

  const hasValidRange =
    isNullableTimestamp(value.from) &&
    isNullableTimestamp(value.to) &&
    (value.from === null || value.to === null || value.from <= value.to);

  return (
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.aiModel === "string" &&
    value.aiModel.trim().length > 0 &&
    typeof value.prompt === "string" &&
    value.prompt.trim().length > 0 &&
    isStringArray(value.sources) &&
    isStringArray(value.keywords) &&
    hasValidRange
  );
}

export function isReportBlocks(value: unknown): value is ReportBlocks {
  return Array.isArray(value) && value.length > 0 && value.every(isReportBlock);
}

export function parseReportBlocks(value: unknown): ReportBlocks {
  if (isReportBlocks(value)) {
    return value;
  }

  throw new Error(
    "Invalid report blocks: expected a non-empty array of blocks with title, aiModel, prompt, sources, keywords, from, and to.",
  );
}
