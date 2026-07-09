const pdfContentType = "application/pdf";
const docxContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function getFilenameFromContentDisposition(value: string | null) {
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

export function getFilenameFromDownloadUrl(downloadUrl: string | null) {
  if (!downloadUrl) {
    return null;
  }

  try {
    const url = new URL(downloadUrl);
    const rawFilename = url.pathname.split("/").at(-1) ?? "";

    return decodeURIComponent(rawFilename).trim() || null;
  } catch {
    return null;
  }
}

export function getFilenameFromResponseHeaders(headers: Headers, downloadUrl: string | null, taskId: string) {
  const urlFilename = getFilenameFromDownloadUrl(downloadUrl);

  if (urlFilename) {
    return withContentTypeExtension(urlFilename, headers.get("content-type")) ?? urlFilename;
  }

  const headerFilename = getFilenameFromContentDisposition(headers.get("content-disposition"));

  if (headerFilename) {
    return headerFilename;
  }

  const contentType = headers.get("content-type")?.toLowerCase().trim() ?? "";

  if (contentType.startsWith(docxContentType)) {
    return `${taskId}.docx`;
  }

  if (contentType.startsWith(pdfContentType)) {
    return `${taskId}.pdf`;
  }

  return taskId;
}

function withContentTypeExtension(filename: string, contentType: string | null) {
  const normalizedFilename = filename.toLowerCase();

  if (normalizedFilename.endsWith(".pdf") || normalizedFilename.endsWith(".docx")) {
    return filename;
  }

  const normalizedContentType = contentType?.toLowerCase().trim() ?? "";

  if (normalizedContentType.startsWith(docxContentType)) {
    return `${filename}.docx`;
  }

  if (normalizedContentType.startsWith(pdfContentType)) {
    return `${filename}.pdf`;
  }

  return null;
}
