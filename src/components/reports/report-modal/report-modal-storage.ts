"use client";

export type ReportModalStorageConfig = {
  changeEventName: string;
  storageKey: string;
};

const DEFAULT_STORED_REPORT_MODAL_AI_MODEL = "";
const storedReportModalAiModelCache = new Map<
  string,
  {
    aiModel: string;
    rawValue: string | null;
  }
>();

export const NEWS_REPORT_MODAL_AI_MODEL_STORAGE_CONFIG: ReportModalStorageConfig = {
  changeEventName: "sunqar-news-report-ai-model-change",
  storageKey: "sunqar-news-report-ai-model",
};

export const COMMENTS_REPORT_MODAL_AI_MODEL_STORAGE_CONFIG: ReportModalStorageConfig = {
  changeEventName: "sunqar-comments-report-ai-model-change",
  storageKey: "sunqar-comments-report-ai-model",
};

function normalizeStoredReportModalAiModel(value: unknown) {
  return typeof value === "string" ? value.trim() : DEFAULT_STORED_REPORT_MODAL_AI_MODEL;
}

export function getStoredReportModalAiModel(config: ReportModalStorageConfig) {
  if (typeof window === "undefined") {
    return DEFAULT_STORED_REPORT_MODAL_AI_MODEL;
  }

  const storedValue = window.localStorage.getItem(config.storageKey);
  const cachedValue = storedReportModalAiModelCache.get(config.storageKey);

  if (cachedValue?.rawValue === storedValue) {
    return cachedValue.aiModel;
  }

  const normalizedStoredValue = normalizeStoredReportModalAiModel(storedValue);

  storedReportModalAiModelCache.set(config.storageKey, {
    aiModel: normalizedStoredValue,
    rawValue: storedValue,
  });

  return normalizedStoredValue;
}

export function setStoredReportModalAiModel(
  config: ReportModalStorageConfig,
  aiModel: string,
) {
  window.localStorage.setItem(
    config.storageKey,
    normalizeStoredReportModalAiModel(aiModel),
  );
  window.dispatchEvent(new Event(config.changeEventName));
}

export function resolveStoredReportModalAiModel(
  storedAiModel: string,
  aiModels: Array<{ value: string }>,
) {
  if (!storedAiModel) {
    return DEFAULT_STORED_REPORT_MODAL_AI_MODEL;
  }

  return aiModels.some((aiModel) => aiModel.value === storedAiModel)
    ? storedAiModel
    : DEFAULT_STORED_REPORT_MODAL_AI_MODEL;
}
