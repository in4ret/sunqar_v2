export function extractTaskId(data: unknown): string | null {
  const taskPayload = Array.isArray(data) ? data[0] : data;

  if (!taskPayload || typeof taskPayload !== "object") {
    return null;
  }

  const taskId = "task_id" in taskPayload ? taskPayload.task_id : null;

  return typeof taskId === "string" && taskId.trim() ? taskId.trim() : null;
}
