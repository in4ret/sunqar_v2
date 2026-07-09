import assert from "node:assert/strict";
import test from "node:test";

import { createTaskDownloadGetHandler } from "@/lib/tasks/task-download-route";

function createHandler(options?: {
  downloadUrl?: string | null;
  fetchImpl?: typeof fetch;
  getCurrentUserImpl?: () => Promise<{ id: string } | null>;
  getTaskDownloadByIdImpl?: (taskId: string, userId: string) => Promise<{ taskId: string; downloadUrl: string | null } | null>;
  markTaskAsReadByIdImpl?: (taskId: string, userId: string) => Promise<boolean>;
}) {
  return createTaskDownloadGetHandler({
    fetchImpl:
      options?.fetchImpl ??
      (async () =>
        new Response("file-body", {
          headers: {
            "Content-Disposition": 'attachment; filename="source-file.pdf"',
            "Content-Type": "application/pdf",
          },
          status: 200,
        })),
    getCurrentUserImpl: options?.getCurrentUserImpl ?? (async () => ({ id: "user-1" })),
    getTaskDownloadByIdImpl:
      options?.getTaskDownloadByIdImpl ??
      (async (taskId) => ({
        downloadUrl: options?.downloadUrl ?? "https://example.com/source-file.pdf",
        taskId,
      })),
    markTaskAsReadByIdImpl: options?.markTaskAsReadByIdImpl ?? (async () => true),
  });
}

function buildParams(taskId = "task-123") {
  return {
    params: Promise.resolve({ taskId }),
  };
}

test("task download route preserves filename from upstream content-disposition", async () => {
  const handler = createHandler();

  const response = await handler(new Request("http://sunqar.local/tasks/task-123"), buildParams());

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-disposition"),
    `attachment; filename="source-file.pdf"; filename*=UTF-8''source-file.pdf`,
  );
});

test("task download route preserves utf-8 filename from upstream content-disposition", async () => {
  const handler = createHandler({
    fetchImpl: async () =>
      new Response("file-body", {
        headers: {
          "Content-Disposition": "attachment; filename*=UTF-8''%D0%BE%D1%82%D1%87%D0%B5%D1%82.docx",
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        status: 200,
      }),
  });

  const response = await handler(new Request("http://sunqar.local/tasks/task-123"), buildParams());

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-disposition"),
    `attachment; filename*=UTF-8''%D0%BE%D1%82%D1%87%D0%B5%D1%82.docx`,
  );
});

test("task download route falls back to filename from upstream url path", async () => {
  const handler = createHandler({
    downloadUrl: "https://example.com/files/final-report.pdf",
    fetchImpl: async () =>
      new Response("file-body", {
        headers: {
          "Content-Type": "application/octet-stream",
        },
        status: 200,
      }),
  });

  const response = await handler(new Request("http://sunqar.local/tasks/task-123"), buildParams());

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-disposition"),
    `attachment; filename="final-report.pdf"; filename*=UTF-8''final-report.pdf`,
  );
});

test("task download route falls back to task id when upstream does not provide a usable filename", async () => {
  const handler = createHandler({
    downloadUrl: "https://example.com/files/",
    fetchImpl: async () =>
      new Response("file-body", {
        headers: {
          "Content-Type": "application/pdf",
        },
        status: 200,
      }),
  });

  const response = await handler(new Request("http://sunqar.local/tasks/task-123"), buildParams());

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-disposition"),
    `attachment; filename="task-123.pdf"; filename*=UTF-8''task-123.pdf`,
  );
});

test("task download route appends extension when upstream filename has none", async () => {
  const handler = createHandler({
    fetchImpl: async () =>
      new Response("file-body", {
        headers: {
          "Content-Disposition": 'attachment; filename="monthly-report"',
          "Content-Type": "application/pdf",
        },
        status: 200,
      }),
  });

  const response = await handler(new Request("http://sunqar.local/tasks/task-123"), buildParams());

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-disposition"),
    `attachment; filename="monthly-report.pdf"; filename*=UTF-8''monthly-report.pdf`,
  );
});
