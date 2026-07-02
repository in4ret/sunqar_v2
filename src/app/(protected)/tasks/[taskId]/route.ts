import { getCurrentUser } from "@/lib/auth/auth";
import { getTaskDownloadById, markTaskAsReadById } from "@/lib/tasks";

type TaskDownloadRouteProps = {
  params: Promise<{
    taskId: string;
  }>;
};

const pdfContentType = "application/pdf";
const docxContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const supportedContentTypes = [pdfContentType, docxContentType] as const;
const genericBinaryContentType = "application/octet-stream";

export async function GET(_request: Request, { params }: TaskDownloadRouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return buildTextResponse("Unauthorized.", 401);
  }

  const { taskId } = await params;
  const task = await getTaskDownloadById(taskId, user.id);

  if (!task) {
    return buildTextResponse("Task not found.", 404);
  }

  await markTaskAsReadById(taskId, user.id);

  if (!task.downloadUrl) {
    return buildTextResponse("Task result is not ready.", 409);
  }

  const upstreamUrl = parseUpstreamUrl(task.downloadUrl);

  if (!upstreamUrl) {
    return buildTextResponse("Task result URL is invalid.", 502);
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: buildUpstreamHeaders(upstreamUrl),
      redirect: "follow",
    });
  } catch (error) {
    console.error("Failed to fetch task file.", error);

    return buildTextResponse("Failed to fetch task result.", 502);
  }

  if (!upstreamResponse.ok) {
    console.error("Task file upstream request failed.", {
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
    "Content-Disposition": `attachment; filename="${filename}"`,
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

  const asciiFilenameMatch = value.match(/filename\s*=\s*"([^"]+)"/i) ?? value.match(/filename\s*=\s*([^;]+)/i);

  return asciiFilenameMatch?.[1]?.trim() ?? null;
}

function getDownloadFilename(
  upstreamFilename: string | null,
  taskId: string,
  contentType: (typeof supportedContentTypes)[number],
) {
  const normalizedFilename = upstreamFilename?.trim() ?? "";

  if (normalizedFilename.toLowerCase().endsWith(".pdf")) {
    return normalizedFilename;
  }

  if (normalizedFilename.toLowerCase().endsWith(".docx")) {
    return normalizedFilename;
  }

  return `${taskId}.${contentType === docxContentType ? "docx" : "pdf"}`;
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
