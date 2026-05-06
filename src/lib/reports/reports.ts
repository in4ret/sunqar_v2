import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import type { ReportBlocks } from "./report-blocks";

export type ReportMutationErrorCode = "report-fields-required";

export type ReportListItem = {
  active: boolean;
  authorName: string;
  description: string;
  id: string;
  period: string;
  title: string;
};

export async function listReports(): Promise<ReportListItem[]> {
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

const defaultReportBlocks: ReportBlocks = [
  {
    aiModel: "",
    keywords: [],
    prompt: "",
    sources: [],
    title: "",
  },
];

function normalizeReportInput(input: {
  active: boolean;
  createdBy: string;
  description: string;
  period: string;
  title: string;
}) {
  return {
    active: input.active,
    createdBy: input.createdBy.trim(),
    description: input.description.trim(),
    period: input.period.trim(),
    title: input.title.trim(),
  };
}

export async function createReport(input: {
  active: boolean;
  createdBy: string;
  description: string;
  period: string;
  title: string;
}) {
  const report = normalizeReportInput(input);

  if (!report.createdBy || !report.title || !report.description || !report.period) {
    return { error: "report-fields-required" as ReportMutationErrorCode };
  }

  db.insert(reports)
    .values({
      active: report.active,
      blocks: defaultReportBlocks,
      createdAt: new Date(),
      createdBy: report.createdBy,
      description: report.description,
      id: crypto.randomUUID(),
      period: report.period,
      title: report.title,
    })
    .run();

  return {
    error: null,
    reportTitle: report.title,
  };
}
