import { getCurrentUser } from "@/lib/auth/auth";
import { getTaskDownloadById, markTaskAsReadById } from "@/lib/tasks";
import { createTaskDownloadGetHandler } from "@/lib/tasks/task-download-route";

export const GET = createTaskDownloadGetHandler({
  fetchImpl: fetch,
  getCurrentUserImpl: getCurrentUser,
  getTaskDownloadByIdImpl: getTaskDownloadById,
  markTaskAsReadByIdImpl: markTaskAsReadById,
});
