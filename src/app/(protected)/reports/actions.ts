"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/auth";
import { type ActionMessage,createActionMessage } from "@/lib/i18n/action-messages";
import {
  createReport,
  deleteReportByUser,
  getReportRunItem,
  parseStoredReportPeriod,
  serializeStoredReportPeriod,
  updateReportActiveByUser,
  updateReportByUser,
} from "@/lib/reports";
import type { ReportBlocks } from "@/lib/reports/report-blocks";
import { getReportEditRoute, routes } from "@/lib/routes";

export type ReportMutationState = {
  active?: boolean;
  error: ActionMessage | null;
  reportId: string | null;
  success: ActionMessage | null;
};
export type ReportDeleteState = ReportMutationState;
export type ReportActiveState = ReportMutationState;
export type ReportRunState = ReportMutationState;

const reportsPath = routes.reports;

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
  const user = await requireRole(["admin", "user"]);
  let blocks: ReportBlocks;
  let period: string;

  try {
    blocks = getReportBlocks(formData);
  } catch {
    return {
      error: createActionMessage("errors.report-block-fields-required"),
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
      error: createActionMessage("errors.report-period-invalid"),
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
      error: createActionMessage(`errors.${result.error}`),
      reportId: null,
      success: null,
    };
  }

  revalidatePath(reportsPath);

  return {
    error: null,
    reportId: null,
    success: createActionMessage("messages.report-created", { title: result.reportTitle }),
  };
}

export async function submitUpdateReport(
  _previousState: ReportMutationState,
  formData: FormData,
): Promise<ReportMutationState> {
  const user = await requireRole(["admin", "user"]);
  const reportId = String(formData.get("reportId") ?? "").trim();
  let blocks: ReportBlocks;
  let period: string;

  try {
    blocks = getReportBlocks(formData);
  } catch {
    return {
      error: createActionMessage("errors.report-block-fields-required"),
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
      error: createActionMessage("errors.report-period-invalid"),
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
    userId: user.id,
    updatedBy: user.id,
  });

  if (result.error) {
    return {
      error: createActionMessage(`errors.${result.error}`),
      reportId,
      success: null,
    };
  }

  revalidatePath(reportsPath);
  revalidatePath(getReportEditRoute(result.reportId));

  return {
    error: null,
    reportId: result.reportId,
    success: createActionMessage("messages.report-updated", { title: result.reportTitle }),
  };
}

export async function submitDeleteReport(
  _previousState: ReportDeleteState,
  formData: FormData,
): Promise<ReportDeleteState> {
  const user = await requireRole(["admin", "user"]);
  const reportId = String(formData.get("id") ?? "").trim();
  const result = await deleteReportByUser(reportId, user.id);

  if (result.error) {
    return {
      error: createActionMessage(`errors.${result.error}`),
      reportId,
      success: null,
    };
  }

  revalidatePath(reportsPath);
  revalidatePath(getReportEditRoute(result.reportId));

  return {
    error: null,
    reportId: result.reportId,
    success: createActionMessage("messages.report-deleted", { title: result.reportTitle }),
  };
}

export async function submitRunReport(
  _previousState: ReportRunState,
  formData: FormData,
): Promise<ReportRunState> {
  const user = await requireRole(["admin", "user"]);
  const reportId = String(formData.get("id") ?? "").trim();
  const report = await getReportRunItem(reportId, user.id);
  const generateReportUrl = process.env.GENERATE_REPORT_URL?.trim();

  if (!report) {
    return {
      error: createActionMessage("errors.report-not-found"),
      reportId,
      success: null,
    };
  }

  if (!generateReportUrl) {
    return {
      error: createActionMessage("errors.report-run-url-missing"),
      reportId: report.id,
      success: null,
    };
  }

  try {
    const response = await fetch(generateReportUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: report.id,
        title: report.title,
        description: report.description,
        author: report.authorName,
        blocks: report.blocks.map((block) => ({
          title: block.title,
          model: block.aiModel,
          prompt: block.prompt,
          sources: block.sources,
          key_words: block.keywords,
        })),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const responseText = await response.text();

      console.error(
        `Generate report request failed with status ${response.status}: ${responseText}`,
      );

      return {
        error: createActionMessage("errors.report-run-request-failed"),
        reportId: report.id,
        success: null,
      };
    }
  } catch (error) {
    console.error("Generate report request failed.", error);

    return {
      error: createActionMessage("errors.report-run-request-failed"),
      reportId: report.id,
      success: null,
    };
  }

  return {
    error: null,
    reportId: report.id,
    success: createActionMessage("messages.report-run", { title: report.title }),
  };
}

export async function submitToggleReportActive(
  _previousState: ReportActiveState,
  formData: FormData,
): Promise<ReportActiveState> {
  const user = await requireRole(["admin", "user"]);
  const reportId = String(formData.get("id") ?? "").trim();
  const nextActive = String(formData.get("active") ?? "").trim() === "true";
  const result = await updateReportActiveByUser({
    active: nextActive,
    id: reportId,
    userId: user.id,
    updatedBy: user.id,
  });

  if (result.error) {
    return {
      active: undefined,
      error: createActionMessage(`errors.${result.error}`),
      reportId,
      success: null,
    };
  }

  revalidatePath(reportsPath);
  revalidatePath(getReportEditRoute(result.reportId));

  return {
    active: result.active,
    error: null,
    reportId: result.reportId,
    success: result.active
      ? createActionMessage("messages.report-activated", { title: result.reportTitle })
      : createActionMessage("messages.report-deactivated", { title: result.reportTitle }),
  };
}
