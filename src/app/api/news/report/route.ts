import { getCurrentUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { createNewsReportPostHandler } from "@/lib/news/news-report-route";
import { publishTaskSnapshotInvalidation } from "@/lib/task-stream-sync";

export const POST = createNewsReportPostHandler({
  getCurrentUserImpl: getCurrentUser,
  insertTaskImpl: async ({ keyWords, taskId, userId }) => {
    db.insert(tasks)
      .values({
        createdAt: new Date(),
        doneAt: null,
        downloadUrl: null,
        error: null,
        keyWords,
        read: false,
        reportId: null,
        status: "pending",
        taskId,
        userId,
      })
      .run();
  },
  publishTaskSnapshotInvalidationImpl: publishTaskSnapshotInvalidation,
  submitDownloadReportRequestImpl: async (payload) => {
    if (!env.apiGatewayUrl) {
      throw new Error("API_GATEWAY_URL is not configured.");
    }

    const downloadReportDocUrl = new URL("/download_report_doc/", env.apiGatewayUrl);

    console.log("###", payload);
    return fetch(downloadReportDocUrl, {
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  },
});
