import { getCurrentUser } from "@/lib/auth/auth";
import { formatLogMessage } from "@/lib/logs";
import { formatTaskSnapshotEvent, registerTaskStreamConnection } from "@/lib/task-stream";
import { startTaskStreamSyncSubscriber } from "@/lib/task-stream-sync-server";
import { listTasksByUserId } from "@/lib/tasks";

const KEEPALIVE_INTERVAL_MS = 30_000;
const SNAPSHOT_REFRESH_INTERVAL_MS = 5_000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await startTaskStreamSyncSubscriber();

  const user = await getCurrentUser();

  if (!user) {
    return Response.json(
      { error: "Unauthorized." },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 401,
      },
    );
  }

  const userId = user.id;
  const tasks = await listTasksByUserId(userId);
  const encoder = new TextEncoder();
  let closeStream = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      let snapshotRefreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let lastSnapshotPayload = formatTaskSnapshotEvent(tasks);

      async function refreshSnapshot() {
        if (isClosed) {
          return;
        }

        try {
          const nextTasks = await listTasksByUserId(userId);
          const nextSnapshotPayload = formatTaskSnapshotEvent(nextTasks);

          if (nextSnapshotPayload !== lastSnapshotPayload) {
            lastSnapshotPayload = nextSnapshotPayload;
            controller.enqueue(encoder.encode(nextSnapshotPayload));
          }
        } catch (error) {
          console.error(formatLogMessage("Failed to refresh task stream snapshot."), error);
        } finally {
          if (!isClosed) {
            snapshotRefreshTimeoutId = setTimeout(refreshSnapshot, SNAPSHOT_REFRESH_INTERVAL_MS);
          }
        }
      }

      const unregisterConnection = registerTaskStreamConnection(
        userId,
        (payload) => {
          if (!isClosed) {
            lastSnapshotPayload = payload;
            controller.enqueue(encoder.encode(payload));
          }
        },
        () => {
          if (isClosed) {
            return;
          }

          isClosed = true;
          clearInterval(keepaliveId);
          if (snapshotRefreshTimeoutId) {
            clearTimeout(snapshotRefreshTimeoutId);
          }
          request.signal.removeEventListener("abort", closeStream);
          controller.close();
        },
      );

      closeStream = () => {
        unregisterConnection();
      };

      controller.enqueue(encoder.encode(lastSnapshotPayload));

      const keepaliveId = setInterval(() => {
        if (!isClosed) {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        }
      }, KEEPALIVE_INTERVAL_MS);

      snapshotRefreshTimeoutId = setTimeout(refreshSnapshot, SNAPSHOT_REFRESH_INTERVAL_MS);

      if (request.signal.aborted) {
        closeStream();
        return;
      }

      request.signal.addEventListener("abort", closeStream, { once: true });
    },
    cancel() {
      closeStream();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
