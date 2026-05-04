const reportBlockKeys = ["title", "aiModel", "prompt", "sources", "keywords"] as const;

export type ReportBlock = {
  title: string;
  aiModel: string;
  prompt: string;
  sources: string[];
  keywords: string[];
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

export function isReportBlock(value: unknown): value is ReportBlock {
  if (!isRecord(value) || !hasExactKeys(value, reportBlockKeys)) {
    return false;
  }

  return (
    typeof value.title === "string" &&
    typeof value.aiModel === "string" &&
    typeof value.prompt === "string" &&
    isStringArray(value.sources) &&
    isStringArray(value.keywords)
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
    "Invalid report blocks: expected a non-empty array of blocks with title, aiModel, prompt, sources, and keywords.",
  );
}
