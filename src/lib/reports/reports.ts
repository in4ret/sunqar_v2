import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";

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
