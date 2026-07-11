import "server-only";

import { eq } from "drizzle-orm";
import Redis from "ioredis";

import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { formatLogMessage } from "@/lib/logs";
import { publishTaskSnapshotInvalidation } from "@/lib/task-stream-sync";

import { resolveSuccessfulTaskDownloadUrl } from "./celery-task-meta-helpers";

const CELERY_TASK_META_PREFIX = "celery-task-meta-";

function failTask(taskId: string, raw: string | null) {
  db.update(tasks)
    .set({
      doneAt: new Date(),
      downloadUrl: null,
      error: raw,
      status: "failure",
    })
    .where(eq(tasks.taskId, taskId))
    .run();
}

function completeSuccessfulTask(taskId: string, downloadUrl: string) {
  db.update(tasks)
    .set({
      doneAt: new Date(),
      downloadUrl,
      error: null,
      status: "success",
    })
    .where(eq(tasks.taskId, taskId))
    .run();
}

export async function processCeleryTaskMeta(taskId: string, raw: string | null) {
  const task = db
    .select({
      payload: tasks.payload,
      taskId: tasks.taskId,
      type: tasks.type,
      userId: tasks.userId,
    })
    .from(tasks)
    .where(eq(tasks.taskId, taskId))
    .get();

  if (!task) return;

  try {
    const parsed = JSON.parse(raw ?? "");
    const status = typeof parsed.status === "string" ? parsed.status : "";
    const downloadUrl = resolveSuccessfulTaskDownloadUrl(task, parsed);

    if (status === "SUCCESS" && downloadUrl) {
      completeSuccessfulTask(taskId, downloadUrl);
    } else {
      failTask(taskId, raw);
    }
  } catch (error) {
    failTask(taskId, raw);
    console.error(formatLogMessage("Failed to process celery task meta for task"), taskId, error);
  }

  await publishTaskSnapshotInvalidation(task.userId);
}

export async function reconcileTaskById(taskId: string): Promise<void> {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    return;
  }

  const connection = process.env.REDIS_CONNECTION;

  if (!connection) {
    console.warn(formatLogMessage("⚠️ REDIS_CONNECTION is not set, task reconciliation skipped"));
    return;
  }

  const redis = new Redis(connection);

  try {
    const raw = await redis.get(`${CELERY_TASK_META_PREFIX}${normalizedTaskId}`);

    if (!raw) {
      return;
    }

    await processCeleryTaskMeta(normalizedTaskId, raw);
  } catch (error) {
    console.warn(formatLogMessage(`⚠️ Failed to reconcile task ${normalizedTaskId} with Redis:`), error);
  } finally {
    redis.disconnect();
  }
}

export async function reconcilePendingTasks(): Promise<void> {
  const pendingTasks = db
    .select({ taskId: tasks.taskId })
    .from(tasks)
    .where(eq(tasks.status, "pending"))
    .all();

  if (pendingTasks.length === 0) {
    return;
  }

  const connection = process.env.REDIS_CONNECTION;

  if (!connection) {
    console.warn(formatLogMessage("⚠️ REDIS_CONNECTION is not set, pending tasks reconciliation skipped"));
    return;
  }

  const redis = new Redis(connection);

  try {
    const keys = pendingTasks.map((task) => `${CELERY_TASK_META_PREFIX}${task.taskId}`);
    const values = await redis.mget(keys);

    await Promise.all(
      values.map((raw, index) => {
        if (!raw) {
          return Promise.resolve();
        }

        const pendingTask = pendingTasks[index];

        if (!pendingTask) {
          return Promise.resolve();
        }

        return processCeleryTaskMeta(pendingTask.taskId, raw);
      }),
    );
  } catch (error) {
    console.warn(formatLogMessage("⚠️ Failed to reconcile pending tasks with Redis:"), error);
  } finally {
    redis.disconnect();
  }
}

export { CELERY_TASK_META_PREFIX };
