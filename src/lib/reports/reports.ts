import "server-only";

import crypto from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";

import { parseReportBlocks, type ReportBlocks } from "./report-blocks";
import { parseStoredReportPeriod, serializeStoredReportPeriod } from "./report-period";

export type ReportMutationErrorCode =
  | "report-fields-required"
  | "report-block-fields-required"
  | "report-period-invalid"
  | "report-not-found";

export type ReportListItem = {
  active: boolean;
  authorName: string;
  description: string;
  id: string;
  period: string;
  title: string;
};

export type ReportEditorItem = {
  blocks: ReportBlocks;
  description: string;
  id: string;
  period: string;
  title: string;
};

export async function listReports(userId: string): Promise<ReportListItem[]> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return [];
  }

  const rows = db
    .select({
      active: reports.active,
      authorName: users.displayName,
      description: reports.description,
      id: reports.id,
      period: reports.period,
      title: reports.title,
    })
    .from(reports)
    .leftJoin(users, eq(reports.createdBy, users.id))
    .where(eq(reports.createdBy, normalizedUserId))
    .orderBy(desc(reports.createdAt))
    .all();

  return rows.map((row) => ({
    active: row.active,
    authorName: row.authorName ?? "—",
    description: row.description,
    id: row.id,
    period: row.period,
    title: row.title,
  }));
}

export async function getReportById(id: string, userId: string): Promise<ReportEditorItem | null> {
  const normalizedId = id.trim();
  const normalizedUserId = userId.trim();

  if (!normalizedId || !normalizedUserId) {
    return null;
  }

  const row = db
    .select({
      blocks: reports.blocks,
      description: reports.description,
      id: reports.id,
      period: reports.period,
      title: reports.title,
    })
    .from(reports)
    .where(and(eq(reports.id, normalizedId), eq(reports.createdBy, normalizedUserId)))
    .get();

  if (!row) {
    return null;
  }

  return {
    blocks: row.blocks,
    description: row.description,
    id: row.id,
    period: row.period,
    title: row.title,
  };
}

function normalizeReportInput(input: {
  active: boolean;
  blocks: ReportBlocks;
  createdBy: string;
  description: string;
  period: string;
  title: string;
}) {
  return {
    active: input.active,
    blocks: parseReportBlocks(input.blocks),
    createdBy: input.createdBy.trim(),
    description: input.description.trim(),
    period: serializeStoredReportPeriod(parseStoredReportPeriod(input.period.trim())),
    title: input.title.trim(),
  };
}

export async function createReport(input: {
  active: boolean;
  blocks: ReportBlocks;
  createdBy: string;
  description: string;
  period: string;
  title: string;
}) {
  let report: ReturnType<typeof normalizeReportInput>;

  try {
    report = normalizeReportInput(input);
  } catch {
    try {
      parseStoredReportPeriod(input.period);

      return { error: "report-block-fields-required" as ReportMutationErrorCode };
    } catch {
      return { error: "report-period-invalid" as ReportMutationErrorCode };
    }
  }

  if (!report.createdBy || !report.title || !report.description || !report.period) {
    return { error: "report-fields-required" as ReportMutationErrorCode };
  }

  const createdAt = new Date();

  db.insert(reports)
    .values({
      active: report.active,
      blocks: report.blocks,
      createdAt,
      createdBy: report.createdBy,
      description: report.description,
      id: crypto.randomUUID(),
      period: report.period,
      title: report.title,
      updatedAt: createdAt,
      updatedBy: report.createdBy,
    })
    .run();

  return {
    error: null,
    reportTitle: report.title,
  };
}

export async function updateReportByUser(input: {
  blocks: ReportBlocks;
  description: string;
  id: string;
  period: string;
  title: string;
  userId: string;
  updatedBy: string;
}) {
  const normalizedId = input.id.trim();
  const normalizedUserId = input.userId.trim();
  const normalizedUpdatedBy = input.updatedBy.trim();
  let report: ReturnType<typeof normalizeReportInput>;

  if (!normalizedId || !normalizedUserId || !normalizedUpdatedBy) {
    return { error: "report-not-found" as ReportMutationErrorCode };
  }

  const existingReport = db
    .select({
      active: reports.active,
      createdBy: reports.createdBy,
      id: reports.id,
    })
    .from(reports)
    .where(and(eq(reports.id, normalizedId), eq(reports.createdBy, normalizedUserId)))
    .get();

  if (!existingReport) {
    return { error: "report-not-found" as ReportMutationErrorCode };
  }

  try {
    report = normalizeReportInput({
      active: existingReport.active,
      blocks: input.blocks,
      createdBy: existingReport.createdBy,
      description: input.description,
      period: input.period,
      title: input.title,
    });
  } catch {
    try {
      parseStoredReportPeriod(input.period);

      return { error: "report-block-fields-required" as ReportMutationErrorCode };
    } catch {
      return { error: "report-period-invalid" as ReportMutationErrorCode };
    }
  }

  if (!report.title || !report.description || !report.period) {
    return { error: "report-fields-required" as ReportMutationErrorCode };
  }

  db.update(reports)
    .set({
      blocks: report.blocks,
      description: report.description,
      period: report.period,
      title: report.title,
      updatedAt: new Date(),
      updatedBy: normalizedUpdatedBy,
    })
    .where(eq(reports.id, existingReport.id))
    .run();

  return {
    error: null,
    reportId: existingReport.id,
    reportTitle: report.title,
  };
}

export async function updateReportActiveByUser(input: {
  active: boolean;
  id: string;
  userId: string;
  updatedBy: string;
}) {
  const normalizedId = input.id.trim();
  const normalizedUserId = input.userId.trim();
  const normalizedUpdatedBy = input.updatedBy.trim();

  if (!normalizedId || !normalizedUserId || !normalizedUpdatedBy) {
    return { error: "report-not-found" as ReportMutationErrorCode };
  }

  const existingReport = db
    .select({
      id: reports.id,
      title: reports.title,
    })
    .from(reports)
    .where(and(eq(reports.id, normalizedId), eq(reports.createdBy, normalizedUserId)))
    .get();

  if (!existingReport) {
    return { error: "report-not-found" as ReportMutationErrorCode };
  }

  db.update(reports)
    .set({
      active: input.active,
      updatedAt: new Date(),
      updatedBy: normalizedUpdatedBy,
    })
    .where(eq(reports.id, existingReport.id))
    .run();

  return {
    active: input.active,
    error: null,
    reportId: existingReport.id,
    reportTitle: existingReport.title,
  };
}

export async function deleteReportByUser(id: string, userId: string) {
  const normalizedId = id.trim();
  const normalizedUserId = userId.trim();

  if (!normalizedId || !normalizedUserId) {
    return { error: "report-not-found" as ReportMutationErrorCode };
  }

  const existingReport = db
    .select({
      id: reports.id,
      title: reports.title,
    })
    .from(reports)
    .where(and(eq(reports.id, normalizedId), eq(reports.createdBy, normalizedUserId)))
    .get();

  if (!existingReport) {
    return { error: "report-not-found" as ReportMutationErrorCode };
  }

  db.delete(reports).where(eq(reports.id, existingReport.id)).run();

  return {
    error: null,
    reportId: existingReport.id,
    reportTitle: existingReport.title,
  };
}
