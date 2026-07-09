import assert from "node:assert/strict";
import test from "node:test";

import {
  getFilenameFromContentDisposition,
  getFilenameFromDownloadUrl,
  getFilenameFromResponseHeaders,
} from "@/lib/tasks/task-download-client";

test("task download client extracts utf-8 filename from content-disposition", () => {
  assert.equal(
    getFilenameFromContentDisposition(
      "attachment; filename=\"_____.docx\"; filename*=UTF-8''%D0%BE%D1%82%D1%87%D0%B5%D1%82.docx",
    ),
    "отчет.docx",
  );
});

test("task download client extracts filename from download url", () => {
  assert.equal(
    getFilenameFromDownloadUrl(
      "https://sunqar.tech/report/09.07.2026_22_07_%D0%A1%D0%98%D0%A2%D0%A3%D0%90%D0%A6%D0%98%D0%AF%20%D0%9D%D0%90%20%D0%91%D0%9B%D0%98%D0%96%D0%9D%D0%95%D0%9C%20%D0%92%D0%9E%D0%A1%D0%A2%D0%9E%D0%9A%D0%95.docx",
    ),
    "09.07.2026_22_07_СИТУАЦИЯ НА БЛИЖНЕМ ВОСТОКЕ.docx",
  );
});

test("task download client falls back to url filename when response header is absent", () => {
  const headers = new Headers({
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  assert.equal(
    getFilenameFromResponseHeaders(
      headers,
      "https://sunqar.tech/report/09.07.2026_22_07_%D0%A1%D0%98%D0%A2%D0%A3%D0%90%D0%A6%D0%98%D0%AF%20%D0%9D%D0%90%20%D0%91%D0%9B%D0%98%D0%96%D0%9D%D0%95%D0%9C%20%D0%92%D0%9E%D0%A1%D0%A2%D0%9E%D0%9A%D0%95.docx",
      "task-123",
    ),
    "09.07.2026_22_07_СИТУАЦИЯ НА БЛИЖНЕМ ВОСТОКЕ.docx",
  );
});

test("task download client prefers filename from download url over fallback header filename", () => {
  const headers = new Headers({
    "Content-Disposition": `attachment; filename="__.docx"`,
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  assert.equal(
    getFilenameFromResponseHeaders(
      headers,
      "https://sunqar.tech/report/09.07.2026_22_07_%D0%A1%D0%98%D0%A2%D0%A3%D0%90%D0%A6%D0%98%D0%AF%20%D0%9D%D0%90%20%D0%91%D0%9B%D0%98%D0%96%D0%9D%D0%95%D0%9C%20%D0%92%D0%9E%D0%A1%D0%A2%D0%9E%D0%9A%D0%95.docx",
      "task-123",
    ),
    "09.07.2026_22_07_СИТУАЦИЯ НА БЛИЖНЕМ ВОСТОКЕ.docx",
  );
});
