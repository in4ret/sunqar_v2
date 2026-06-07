import { getCurrentUser } from "@/lib/auth/auth";
import { getTaskPreviewById } from "@/lib/tasks";

type TaskPreviewRouteProps = {
  params: Promise<{
    taskId: string;
  }>;
};

const pdfContentType = "application/pdf";

export async function GET(_request: Request, { params }: TaskPreviewRouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return buildTextResponse("Unauthorized.", 401);
  }

  const { taskId } = await params;
  const task = await getTaskPreviewById(taskId, user.id);

  if (!task) {
    return buildTextResponse("Task not found.", 404);
  }

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
    console.error("Failed to fetch task preview.", error);

    return buildTextResponse("Failed to fetch task result.", 502);
  }

  if (!upstreamResponse.ok) {
    console.error("Task preview upstream request failed.", {
      status: upstreamResponse.status,
      taskId: task.taskId,
      url: upstreamUrl.toString(),
    });

    if (upstreamResponse.status === 401) {
      return buildTextResponse("Upstream task result requires authorization.", 502);
    }

    return buildTextResponse("Upstream task result is unavailable.", 502);
  }

  const upstreamContentType = upstreamResponse.headers.get("content-type");

  if (!upstreamContentType?.toLowerCase().startsWith(pdfContentType)) {
    return buildTextResponse("Upstream task result is not a PDF.", 502);
  }

  const filename = getPreviewFilename(upstreamUrl, task.taskId);
  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Content-Type": pdfContentType,
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

function getPreviewFilename(url: URL, taskId: string) {
  const rawFilename = url.pathname.split("/").at(-1) ?? "";
  const decodedFilename = decodeURIComponent(rawFilename).trim();

  if (decodedFilename.toLowerCase().endsWith(".pdf")) {
    return decodedFilename;
  }

  return `${taskId}.pdf`;
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

  const username = process.env.REPORT_DOWNLOAD_USERNAME?.trim();
  const password = process.env.REPORT_DOWNLOAD_PASSWORD?.trim();

  if (!username || !password) {
    return null;
  }

  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}
