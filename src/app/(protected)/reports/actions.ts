"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/lib/auth/auth";
import {
  createReport,
  deleteReportByUser,
  parseStoredReportPeriod,
  serializeStoredReportPeriod,
  updateReportActiveByUser,
  updateReportByUser,
} from "@/lib/reports";
import type { ReportBlocks } from "@/lib/reports/report-blocks";

export type ReportMutationState = {
  active?: boolean;
  error: string | null;
  reportId: string | null;
  success: string | null;
};
export type ReportDeleteState = ReportMutationState;
export type ReportActiveState = ReportMutationState;

const reportsPath = "/reports";

function getBlockIndex(name: string) {
  const match = /^blocks\[(\d+)\]\./.exec(name);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1] ?? "", 10);
}

function getStringList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getReportBlocks(formData: FormData): ReportBlocks {
  const blockIndices = new Set<number>();

  for (const [name] of formData.entries()) {
    const blockIndex = getBlockIndex(name);

    if (blockIndex !== null) {
      blockIndices.add(blockIndex);
    }
  }

  const blocks = Array.from(blockIndices)
    .sort((left, right) => left - right)
    .map((index) => ({
      aiModel: String(formData.get(`blocks[${index}].aiModel`) ?? "").trim(),
      keywords: getStringList(formData.get(`blocks[${index}].keywords`)),
      prompt: String(formData.get(`blocks[${index}].prompt`) ?? "").trim(),
      sources: getStringList(formData.get(`blocks[${index}].sources`)),
      title: String(formData.get(`blocks[${index}].title`) ?? "").trim(),
    }));

  if (blocks.length === 0) {
    throw new Error("Report blocks are required.");
  }

  return blocks as ReportBlocks;
}

export async function submitCreateReport(
  _previousState: ReportMutationState,
  formData: FormData,
): Promise<ReportMutationState> {
  const user = await requireRole("user");
  const t = await getTranslations();
  let blocks: ReportBlocks;
  let period: string;

  try {
    blocks = getReportBlocks(formData);
  } catch {
    return {
      error: t("errors.report-block-fields-required"),
      reportId: null,
      success: null,
    };
  }

  try {
    period = serializeStoredReportPeriod(
      parseStoredReportPeriod(String(formData.get("period") ?? "").trim()),
    );
  } catch {
    return {
      error: t("errors.report-period-invalid"),
      reportId: null,
      success: null,
    };
  }

  const result = await createReport({
    active: true,
    blocks,
    createdBy: user.id,
    description: String(formData.get("description") ?? ""),
    period,
    title: String(formData.get("title") ?? ""),
  });

  if (result.error) {
    return {
      error: t(`errors.${result.error}`),
      reportId: null,
      success: null,
    };
  }

  revalidatePath(reportsPath);

  return {
    error: null,
    reportId: null,
    success: t("messages.report-created", { title: result.reportTitle }),
  };
}

export async function submitUpdateReport(
  _previousState: ReportMutationState,
  formData: FormData,
): Promise<ReportMutationState> {
  const user = await requireRole("user");
  const t = await getTranslations();
  const reportId = String(formData.get("reportId") ?? "").trim();
  let blocks: ReportBlocks;
  let period: string;

  try {
    blocks = getReportBlocks(formData);
  } catch {
    return {
      error: t("errors.report-block-fields-required"),
      reportId,
      success: null,
    };
  }

  try {
    period = serializeStoredReportPeriod(
      parseStoredReportPeriod(String(formData.get("period") ?? "").trim()),
    );
  } catch {
    return {
      error: t("errors.report-period-invalid"),
      reportId,
      success: null,
    };
  }

  const result = await updateReportByUser({
    blocks,
    description: String(formData.get("description") ?? ""),
    id: reportId,
    period,
    title: String(formData.get("title") ?? ""),
    updatedBy: user.id,
  });

  if (result.error) {
    return {
      error: t(`errors.${result.error}`),
      reportId,
      success: null,
    };
  }

  revalidatePath(reportsPath);
  revalidatePath(`/reports/${result.reportId}/edit`);

  return {
    error: null,
    reportId: result.reportId,
    success: t("messages.report-updated", { title: result.reportTitle }),
  };
}

export async function submitDeleteReport(
  _previousState: ReportDeleteState,
  formData: FormData,
): Promise<ReportDeleteState> {
  await requireRole("user");
  const t = await getTranslations();
  const reportId = String(formData.get("id") ?? "").trim();
  const result = await deleteReportByUser(reportId);

  if (result.error) {
    return {
      error: t(`errors.${result.error}`),
      reportId,
      success: null,
    };
  }

  revalidatePath(reportsPath);
  revalidatePath(`/reports/${result.reportId}/edit`);

  return {
    error: null,
    reportId: result.reportId,
    success: t("messages.report-deleted", { title: result.reportTitle }),
  };
}

export async function submitToggleReportActive(
  _previousState: ReportActiveState,
  formData: FormData,
): Promise<ReportActiveState> {
  const user = await requireRole("user");
  const t = await getTranslations();
  const reportId = String(formData.get("id") ?? "").trim();
  const nextActive = String(formData.get("active") ?? "").trim() === "true";
  const result = await updateReportActiveByUser({
    active: nextActive,
    id: reportId,
    updatedBy: user.id,
  });

  if (result.error) {
    return {
      active: undefined,
      error: t(`errors.${result.error}`),
      reportId,
      success: null,
    };
  }

  revalidatePath(reportsPath);
  revalidatePath(`/reports/${result.reportId}/edit`);

  return {
    active: result.active,
    error: null,
    reportId: result.reportId,
    success: result.active
      ? t("messages.report-activated", { title: result.reportTitle })
      : t("messages.report-deactivated", { title: result.reportTitle }),
  };
}
