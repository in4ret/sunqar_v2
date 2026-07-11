import { formatLogMessage } from "@/lib/logs";
import { extractTaskId } from "@/lib/tasks/extract-task-id";
import { normalizeSearchQuery } from "@/lib/utils";

type GetCurrentUser = () => Promise<
  | {
      displayName: string;
      id: string;
    }
  | null
>;

type InsertCommentsReportTaskInput = {
  keyWord: string;
  taskId: string;
  userId: string;
};

type CommentsReportRequestBody = {
  from?: string;
  model: string;
  posts: string[];
  prompt: string;
  query: string;
  to?: string;
};

type CreateCommentsReportPostHandlerDependencies = {
  getCurrentUserImpl: GetCurrentUser;
  insertTaskImpl: (input: InsertCommentsReportTaskInput) => Promise<void>;
  listCommentIdsForReportImpl: (input: {
    from: string;
    posts: string[];
    query: string;
    to: string;
  }) => Promise<string[]>;
  publishTaskSnapshotInvalidationImpl: (userId: string) => Promise<void>;
  submitDownloadCommentsRequestImpl: (payload: {
    author: string;
    ids: string[];
    key_words: string;
    model: string;
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

function isCommentsReportRequestBody(value: unknown): value is CommentsReportRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<CommentsReportRequestBody>;

  return (
    typeof body.model === "string" &&
    Array.isArray(body.posts) &&
    body.posts.every((post) => typeof post === "string") &&
    typeof body.prompt === "string" &&
    typeof body.query === "string" &&
    (typeof body.from === "string" || typeof body.from === "undefined") &&
    (typeof body.to === "string" || typeof body.to === "undefined")
  );
}

export function createCommentsReportPostHandler({
  getCurrentUserImpl,
  insertTaskImpl,
  listCommentIdsForReportImpl,
  publishTaskSnapshotInvalidationImpl,
  submitDownloadCommentsRequestImpl,
}: CreateCommentsReportPostHandlerDependencies) {
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

    if (!isCommentsReportRequestBody(body)) {
      return buildJsonResponse({ error: "Invalid request body." }, 400);
    }

    const keyWords = normalizeSearchQuery(body.query);
    const model = body.model.trim();
    const prompt = body.prompt.trim();
    const ids = await listCommentIdsForReportImpl({
      from: body.from?.trim() ?? "",
      posts: body.posts,
      query: keyWords,
      to: body.to?.trim() ?? "",
    });

    try {
      const response = await submitDownloadCommentsRequestImpl({
        author: user.displayName,
        ids,
        key_words: keyWords,
        model,
        prompt,
      });
      const responseText = await response.text();

      if (!response.ok) {
        return buildJsonResponse(
          {
            details: responseText,
            error: "Failed to generate comments document.",
          },
          response.status,
        );
      }

      let responseData: unknown;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        console.error(formatLogMessage("Comments report response is not valid JSON."), responseText);

        return buildJsonResponse({ error: "Failed to read comments task response." }, 502);
      }

      const taskId = extractTaskId(responseData);

      if (!taskId) {
        console.error(
          formatLogMessage("Comments report response succeeded without a valid task_id."),
          responseData,
        );

        return buildJsonResponse({ error: "Report task_id is missing in response." }, 502);
      }

      await insertTaskImpl({
        keyWord: keyWords,
        taskId,
        userId: user.id,
      });
      await publishTaskSnapshotInvalidationImpl(user.id);

      return buildJsonResponse({ ok: true, taskId }, 200);
    } catch (error) {
      console.error(
        formatLogMessage("Failed to submit comments report request to API gateway download_comments endpoint."),
        error,
      );

      return buildJsonResponse({ error: "Failed to reach API gateway." }, 502);
    }
  };
}
