import { formatLogMessage } from "@/lib/logs";
import { extractTaskId } from "@/lib/tasks/extract-task-id";

type GetCurrentUser = () => Promise<
  | {
      displayName: string;
      id: string;
    }
  | null
>;

type InsertNewsReportTaskInput = {
  keyWords: string;
  taskId: string;
  userId: string;
};

type NewsReportRequestBody = {
  additional_data: string;
  ids: string[];
  keyWords: string;
  model: string;
  opinion_data: string;
  prompt: string;
};

type CreateNewsReportPostHandlerDependencies = {
  getCurrentUserImpl: GetCurrentUser;
  insertTaskImpl: (input: InsertNewsReportTaskInput) => Promise<void>;
  publishTaskSnapshotInvalidationImpl: (userId: string) => Promise<void>;
  submitDownloadReportRequestImpl: (payload: {
    additional_data: string;
    author: string;
    ids: string[];
    key_words: string;
    model: string;
    opinion_data: string;
    prompt: string;
  }) => Promise<Response>;
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
    typeof body.additional_data === "string" &&
    Array.isArray(body.ids) &&
    body.ids.every((id) => typeof id === "string") &&
    typeof body.keyWords === "string" &&
    typeof body.model === "string" &&
    typeof body.opinion_data === "string" &&
    typeof body.prompt === "string"
  );
}

export function createNewsReportPostHandler({
  getCurrentUserImpl,
  insertTaskImpl,
  publishTaskSnapshotInvalidationImpl,
  submitDownloadReportRequestImpl,
}: CreateNewsReportPostHandlerDependencies) {
  return async function POST(request: Request) {
    const user = await getCurrentUserImpl();

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

    const keyWords = body.keyWords.trim();
    const payload = {
      additional_data: body.additional_data.trim(),
      author: user.displayName,
      ids: body.ids.map((id) => id.trim()).filter((id) => id.length > 0),
      key_words: keyWords,
      model: body.model.trim(),
      opinion_data: body.opinion_data.trim(),
      prompt: body.prompt.trim(),
    };

    try {
      const response = await submitDownloadReportRequestImpl(payload);
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
        console.error(formatLogMessage("News report doc response is not valid JSON."), responseText);

        return buildJsonResponse({ error: "Failed to read report task response." }, 502);
      }

      const taskId = extractTaskId(responseData);

      if (!taskId) {
        console.error(formatLogMessage("News report doc response succeeded without a valid task_id."), responseData);

        return buildJsonResponse({ error: "Report task_id is missing in response." }, 502);
      }

      await insertTaskImpl({
        keyWords,
        taskId,
        userId: user.id,
      });
      await publishTaskSnapshotInvalidationImpl(user.id);

      return buildJsonResponse({ ok: true, taskId }, 200);
    } catch (error) {
      console.error(
        formatLogMessage("Failed to submit news report request to API gateway download_report_doc endpoint."),
        error,
      );

      return buildJsonResponse({ error: "Failed to reach API gateway." }, 502);
    }
  };
}
