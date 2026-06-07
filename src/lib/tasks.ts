import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { reports, tasks } from "@/lib/db/schema";

export type HeaderTaskItem = {
  taskId: string;
  status: "pending" | "success" | "failure";
  createdAt: string;
  doneAt: string | null;
  downloadUrl: string | null;
  error: string | null;
  reportTitle: string | null;
  reportDescription: string | null;
};

export type TaskPreviewItem = {
  taskId: string;
  downloadUrl: string | null;
};

export async function listTasksByUserId(userId: string): Promise<HeaderTaskItem[]> {
  return db
    .select({
      taskId: tasks.taskId,
      status: tasks.status,
      createdAt: tasks.createdAt,
      doneAt: tasks.doneAt,
      downloadUrl: tasks.downloadUrl,
      error: tasks.error,
      reportTitle: reports.title,
      reportDescription: reports.description,
    })
    .from(tasks)
    .innerJoin(reports, eq(tasks.reportId, reports.id))
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt))
    .all()
    .map((task) => ({
      taskId: task.taskId,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      doneAt: task.doneAt?.toISOString() ?? null,
      downloadUrl: task.downloadUrl,
      error: task.error,
      reportTitle: task.reportTitle,
      reportDescription: task.reportDescription,
    }));
}

export async function getTaskPreviewById(taskId: string, userId: string): Promise<TaskPreviewItem | null> {
  const task = db
    .select({
      taskId: tasks.taskId,
      downloadUrl: tasks.downloadUrl,
    })
    .from(tasks)
    .where(and(eq(tasks.taskId, taskId), eq(tasks.userId, userId)))
    .get();

  if (!task) {
    return null;
  }

  return {
    taskId: task.taskId,
    downloadUrl: task.downloadUrl,
  };
}
