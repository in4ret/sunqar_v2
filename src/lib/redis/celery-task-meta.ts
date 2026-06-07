import "server-only";

// import Redis from "ioredis";

const CELERY_TASK_META_PREFIX = "celery-task-meta-";

export async function processCeleryTaskMeta(taskId: string, raw: string | null) {
  try {
    const parsed = JSON.parse(raw ?? "");
    const status = typeof parsed.status === "string" ? parsed.status : "";
    const downloadUrl = parsed.result.download_url ?? null;

    if (status === "SUCCESS" && downloadUrl) {
      // await completeTask(taskId, downloadUrl);
      console.log("### Task", taskId, "succeed");
    } else {
      // await failTask(taskId, raw);
      console.error("### Task", taskId, "failed:", raw);
    }

  } catch (error) {
    // await failTask(taskId, raw);
  }
}
/*
export async function reconcilePendingTasks(tasks: ProcessingFile[]) {
  const pendingTasks = tasks.filter((task) => task.status === "pending");

  if (pendingTasks.length === 0) {
    return;
  }

  const connection = process.env.REDIS_CONNECTION;

  if (!connection) {
    console.warn("⚠️ REDIS_CONNECTION is not set, pending tasks reconciliation skipped");
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

        return processCeleryTaskMeta(pendingTasks[index].taskId, raw);
      }),
    );
  } catch (error) {
    console.warn("⚠️ Failed to reconcile pending tasks with Redis:", error);
  } finally {
    redis.disconnect();
  }
}
*/
export { CELERY_TASK_META_PREFIX };
