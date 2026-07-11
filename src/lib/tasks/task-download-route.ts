import { formatLogMessage } from "@/lib/logs";
import type { TaskDownloadItem } from "@/lib/tasks";

type GetCurrentUser = () => Promise<{ id: string } | null>;
type GetTaskDownloadById = (taskId: string, userId: string) => Promise<TaskDownloadItem | null>;
type MarkTaskAsReadById = (taskId: string, userId: string) => Promise<boolean>;
type FetchImpl = typeof fetch;

type TaskDownloadRouteParams = {
  params: Promise<{
    taskId: string;
  }>;
};

type TaskDownloadGetHandlerDependencies = {
  fetchImpl: FetchImpl;
  getCurrentUserImpl: GetCurrentUser;
  getTaskDownloadByIdImpl: GetTaskDownloadById;
  markTaskAsReadByIdImpl: MarkTaskAsReadById;
};

const pdfContentType = "application/pdf";
const docxContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const supportedContentTypes = [pdfContentType, docxContentType] as const;
const genericBinaryContentType = "application/octet-stream";

export function createTaskDownloadGetHandler({
  fetchImpl,
  getCurrentUserImpl,
  getTaskDownloadByIdImpl,
  markTaskAsReadByIdImpl,
}: TaskDownloadGetHandlerDependencies) {
  return async function GET(_request: Request, { params }: TaskDownloadRouteParams) {
    const user = await getCurrentUserImpl();

    if (!user) {
      return buildTextResponse("Unauthorized.", 401);
    }

    const { taskId } = await params;
    const task = await getTaskDownloadByIdImpl(taskId, user.id);

    if (!task) {
      return buildTextResponse("Task not found.", 404);
    }

    await markTaskAsReadByIdImpl(taskId, user.id);

    if (!task.downloadUrl) {
      return buildTextResponse("Task result is not ready.", 409);
    }

    const upstreamUrl = parseUpstreamUrl(task.downloadUrl);

    if (!upstreamUrl) {
      return buildTextResponse("Task result URL is invalid.", 502);
    }

    let upstreamResponse: Response;

    try {
      upstreamResponse = await fetchImpl(upstreamUrl, {
        cache: "no-store",
        headers: buildUpstreamHeaders(upstreamUrl),
        redirect: "follow",
      });
    } catch (error) {
      console.error(formatLogMessage("Failed to fetch task file."), error);

      return buildTextResponse("Failed to fetch task result.", 502);
    }

    if (!upstreamResponse.ok) {
      console.error(formatLogMessage("Task file upstream request failed."), {
        status: upstreamResponse.status,
        taskId: task.taskId,
        url: upstreamUrl.toString(),
      });

      if (upstreamResponse.status === 401) {
        return buildTextResponse("Upstream task result requires authorization.", 502);
      }

      return buildTextResponse("Upstream task result is unavailable.", 502);
    }

    const upstreamFilename = getUpstreamFilename(upstreamResponse.headers, upstreamUrl);
    const upstreamContentType = getSupportedContentType(
      upstreamResponse.headers.get("content-type"),
      upstreamFilename,
    );

    if (!upstreamContentType) {
      return buildTextResponse("Upstream task result has an unsupported file type.", 502);
    }

    const filename = getDownloadFilename(upstreamFilename, task.taskId, upstreamContentType);
    const responseHeaders = new Headers({
      "Cache-Control": "no-store",
      "Content-Disposition": buildContentDisposition(filename),
      "Content-Type": upstreamContentType,
    });
    const contentLength = upstreamResponse.headers.get("content-length");

    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    return new Response(upstreamResponse.body, {
      headers: responseHeaders,
      status: 200,
    });
  };
}

function getSupportedContentType(value: string | null, filename: string | null) {
  const normalizedValue = value?.toLowerCase().trim();

  if (normalizedValue) {
    const supportedContentType = supportedContentTypes.find((contentType) =>
      normalizedValue.startsWith(contentType),
    );

    if (supportedContentType) {
      return supportedContentType;
    }

    if (normalizedValue.startsWith(genericBinaryContentType)) {
      return getContentTypeFromFilename(filename);
    }
  }

  return getContentTypeFromFilename(filename);
}

function buildTextResponse(message: string, status: number) {
  return new Response(message, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
    status,
  });
}

function parseUpstreamUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (url.protocol === "http:") {
      url.protocol = "https:";
    }

    return url;
  } catch {
    return null;
  }
}

function getUpstreamFilename(headers: Headers, url: URL) {
  const filenameFromHeader = parseFilenameFromContentDisposition(headers.get("content-disposition"));

  if (filenameFromHeader) {
    return filenameFromHeader;
  }

  const rawFilename = url.pathname.split("/").at(-1) ?? "";

  return decodeURIComponent(rawFilename).trim();
}

function parseFilenameFromContentDisposition(value: string | null) {
  if (!value) {
    return null;
  }

  const utf8FilenameMatch = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);

  if (utf8FilenameMatch?.[1]) {
    return decodeURIComponent(utf8FilenameMatch[1]).trim();
  }

  const asciiFilenameMatch =
    value.match(/filename\s*=\s*"([^"]+)"/i) ?? value.match(/filename\s*=\s*([^;]+)/i);

  return asciiFilenameMatch?.[1]?.trim() ?? null;
}

function getDownloadFilename(
  upstreamFilename: string | null,
  taskId: string,
  contentType: (typeof supportedContentTypes)[number],
) {
  const normalizedFilename = upstreamFilename?.trim() ?? "";

  if (!normalizedFilename) {
    return buildFallbackFilename(taskId, contentType);
  }

  const lowercaseFilename = normalizedFilename.toLowerCase();

  if (lowercaseFilename.endsWith(".pdf")) {
    return normalizedFilename;
  }

  if (lowercaseFilename.endsWith(".docx")) {
    return normalizedFilename;
  }

  if (hasFileExtension(normalizedFilename)) {
    return buildFallbackFilename(taskId, contentType);
  }

  return `${normalizedFilename}${getFileExtensionForContentType(contentType)}`;
}

function getContentTypeFromFilename(filename: string | null) {
  const normalizedFilename = filename?.toLowerCase().trim() ?? "";

  if (normalizedFilename.endsWith(".pdf")) {
    return pdfContentType;
  }

  if (normalizedFilename.endsWith(".docx")) {
    return docxContentType;
  }

  return null;
}

function buildUpstreamHeaders(url: URL) {
  const headers = new Headers();
  const basicAuthValue = getBasicAuthValue(url);

  if (basicAuthValue) {
    headers.set("Authorization", basicAuthValue);
  }

  return headers;
}

function getBasicAuthValue(url: URL) {
  if (url.username || url.password) {
    return `Basic ${Buffer.from(`${url.username}:${url.password}`).toString("base64")}`;
  }

  return null;
}

function buildFallbackFilename(taskId: string, contentType: (typeof supportedContentTypes)[number]) {
  return `${taskId}${getFileExtensionForContentType(contentType)}`;
}

function getFileExtensionForContentType(contentType: (typeof supportedContentTypes)[number]) {
  return contentType === docxContentType ? ".docx" : ".pdf";
}

function hasFileExtension(filename: string) {
  const lastSegment = filename.split("/").at(-1) ?? filename;
  const extension = lastSegment.split(".").at(-1);

  return lastSegment.includes(".") && extension !== "";
}

function buildContentDisposition(filename: string) {
  const encodedFilename = encodeURIComponent(filename);
  const asciiFilename = filename.replaceAll("\\", "_").replaceAll("\"", "_");

  if (isAsciiOnly(asciiFilename)) {
    return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
  }

  return `attachment; filename*=UTF-8''${encodedFilename}`;
}

function isAsciiOnly(value: string) {
  return /^[\x20-\x7E]+$/.test(value);
}
