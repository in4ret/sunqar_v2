import "server-only";

import Redis from "ioredis";

import { formatLogMessage } from "@/lib/logs";
import { broadcastTaskSnapshotToUser } from "@/lib/task-stream";
import { TASK_STREAM_SYNC_CHANNEL } from "@/lib/task-stream-sync";

type GlobalTaskStreamSyncSubscriberState = {
  taskStreamSyncSubscriberStarted?: boolean;
  taskStreamSyncSubscriberStarting?: Promise<void>;
  taskStreamSyncWarnedMissingConnection?: boolean;
};

const globalTaskStreamSync = globalThis as typeof globalThis & GlobalTaskStreamSyncSubscriberState;

function getRedisConnection() {
  const connection = process.env.REDIS_CONNECTION;

  if (!connection && !globalTaskStreamSync.taskStreamSyncWarnedMissingConnection) {
    globalTaskStreamSync.taskStreamSyncWarnedMissingConnection = true;
    console.warn(formatLogMessage("⚠️ REDIS_CONNECTION is not set, task stream sync subscriber skipped"));
  }

  return connection;
}

export async function startTaskStreamSyncSubscriber() {
  if (globalTaskStreamSync.taskStreamSyncSubscriberStarted) {
    return;
  }

  const connection = getRedisConnection();

  if (!connection) {
    return;
  }

  if (globalTaskStreamSync.taskStreamSyncSubscriberStarting) {
    await globalTaskStreamSync.taskStreamSyncSubscriberStarting;
    return;
  }

  const startupPromise = (async () => {
    const subscriber = new Redis(connection);

    subscriber.on("message", (_channel, userId) => {
      void broadcastTaskSnapshotToUser(userId);
    });

    try {
      await subscriber.subscribe(TASK_STREAM_SYNC_CHANNEL);
      globalTaskStreamSync.taskStreamSyncSubscriberStarted = true;
    } catch (error) {
      subscriber.disconnect();
      throw error;
    }
  })();

  globalTaskStreamSync.taskStreamSyncSubscriberStarting = startupPromise;

  try {
    await startupPromise;
  } finally {
    globalTaskStreamSync.taskStreamSyncSubscriberStarting = undefined;
  }
}
