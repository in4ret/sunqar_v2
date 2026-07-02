import { getCurrentUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { publishTaskSnapshotInvalidation } from "@/lib/task-stream-sync";
import { extractTaskId } from "@/lib/tasks/extract-task-id";

type NewsReportRequestBody = {
  ids: string[];
  keyWords: string;
  model: string;
  prompt: string;
};

function buildJsonResponse(payload: object, status: number) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function isNewsReportRequestBody(value: unknown): value is NewsReportRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<Record<keyof NewsReportRequestBody, unknown>>;

  return (
    Array.isArray(body.ids) &&
    body.ids.every((id) => typeof id === "string") &&
    typeof body.keyWords === "string" &&
    typeof body.model === "string" &&
    typeof body.prompt === "string"
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return buildJsonResponse({ error: "Unauthorized." }, 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return buildJsonResponse({ error: "Invalid request body." }, 400);
  }

  if (!isNewsReportRequestBody(body)) {
    return buildJsonResponse({ error: "Invalid request body." }, 400);
  }

  const payload = {
    author: user.displayName,
    ids: body.ids.map((id) => id.trim()).filter((id) => id.length > 0),
    key_words: body.keyWords.trim(),
    model: body.model.trim(),
    prompt: body.prompt.trim(),
  };

  if (!env.apiGatewayUrl) {
    return buildJsonResponse({ error: "API_GATEWAY_URL is not configured." }, 500);
  }

  const downloadReportDocUrl = new URL("/download_report_doc/", env.apiGatewayUrl);

  try {
    const response = await fetch(downloadReportDocUrl, {
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const responseText = await response.text();

    if (!response.ok) {
      return buildJsonResponse(
        {
          details: responseText,
          error: "Failed to generate report document.",
        },
        response.status,
      );
    }

    let responseData: unknown;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error("News report doc response is not valid JSON.", responseText);

      return buildJsonResponse({ error: "Failed to read report task response." }, 502);
    }

    const taskId = extractTaskId(responseData);

    if (!taskId) {
      console.error("News report doc response succeeded without a valid task_id.", responseData);

      return buildJsonResponse({ error: "Report task_id is missing in response." }, 502);
    }

    db.insert(tasks)
      .values({
        createdAt: new Date(),
        doneAt: null,
        downloadUrl: null,
        error: null,
        keyWords: body.keyWords.trim(),
        read: false,
        reportId: null,
        status: "pending",
        taskId,
        userId: user.id,
      })
      .run();

    await publishTaskSnapshotInvalidation(user.id);

    return buildJsonResponse({ ok: true, taskId }, 200);
  } catch (error) {
    console.error("Failed to submit news report request to API gateway download_report_doc endpoint.", error);

    return buildJsonResponse({ error: "Failed to reach API gateway." }, 502);
  }
}
