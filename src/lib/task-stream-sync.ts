import Redis from "ioredis";

const TASK_STREAM_SYNC_CHANNEL = "sunqar:task-stream:sync";

type GlobalTaskStreamSyncPublisherState = {
  taskStreamSyncPublisher?: Redis;
  taskStreamSyncWarnedMissingConnection?: boolean;
};

const globalTaskStreamSync = globalThis as typeof globalThis & GlobalTaskStreamSyncPublisherState;

function getRedisConnection() {
  const connection = process.env.REDIS_CONNECTION;

  if (!connection && !globalTaskStreamSync.taskStreamSyncWarnedMissingConnection) {
    globalTaskStreamSync.taskStreamSyncWarnedMissingConnection = true;
    console.warn("⚠️ REDIS_CONNECTION is not set, task stream sync publish skipped");
  }

  return connection;
}

function getTaskStreamSyncPublisher() {
  const connection = getRedisConnection();

  if (!connection) {
    return null;
  }

  if (!globalTaskStreamSync.taskStreamSyncPublisher) {
    globalTaskStreamSync.taskStreamSyncPublisher = new Redis(connection);
  }

  return globalTaskStreamSync.taskStreamSyncPublisher;
}

export async function publishTaskSnapshotInvalidation(userId: string) {
  const publisher = getTaskStreamSyncPublisher();

  if (!publisher) {
    return;
  }

  await publisher.publish(TASK_STREAM_SYNC_CHANNEL, userId);
}

export { TASK_STREAM_SYNC_CHANNEL };
