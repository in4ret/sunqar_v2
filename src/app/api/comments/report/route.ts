import { getCurrentUser } from "@/lib/auth/auth";
import { listCommentIdsForReport } from "@/lib/comments/comments-report";
import { createCommentsReportPostHandler } from "@/lib/comments/comments-report-route";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { publishTaskSnapshotInvalidation } from "@/lib/task-stream-sync";

export const POST = createCommentsReportPostHandler({
  getCurrentUserImpl: getCurrentUser,
  insertTaskImpl: async ({ keyWord, taskId, userId }) => {
    db.insert(tasks)
      .values({
        createdAt: new Date(),
        doneAt: null,
        downloadUrl: null,
        error: null,
        keyWords: keyWord,
        read: false,
        reportId: null,
        status: "pending",
        taskId,
        userId,
      })
      .run();
  },
  listCommentIdsForReportImpl: listCommentIdsForReport,
  publishTaskSnapshotInvalidationImpl: publishTaskSnapshotInvalidation,
  submitDownloadCommentsRequestImpl: async (payload) => {
    if (!env.apiGatewayUrl) {
      throw new Error("API_GATEWAY_URL is not configured.");
    }

    const downloadCommentsUrl = new URL("/download_comments", env.apiGatewayUrl);

    console.log("###", JSON.stringify(payload, null, 2));
    return fetch(downloadCommentsUrl, {
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  },
});
