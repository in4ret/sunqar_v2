import "server-only";

import Redis from "ioredis";

import {
  CELERY_TASK_META_PREFIX,
  processCeleryTaskMeta,
  reconcilePendingTasks,
} from "@/lib/redis/celery-task-meta";

type GlobalRedisSubState = {
  redisTaskSubscriberStarted?: boolean;
  redisTaskSubscriberStarting?: Promise<void>;
  redisTaskSubscriberCleanup?: () => Promise<void>;
};

const globalRedisSub = globalThis as typeof globalThis & GlobalRedisSubState;

export async function startRedisSub() {
  if (globalRedisSub.redisTaskSubscriberStarted) {
    console.log("ℹ️ Redis task subscriber already started");
    return;
  }

  const connection = process.env.REDIS_CONNECTION;

  if (!connection) {
    console.warn("⚠️ REDIS_CONNECTION is not set, Redis task subscriber skipped");
    return;
  }

  if (globalRedisSub.redisTaskSubscriberStarting) {
    await globalRedisSub.redisTaskSubscriberStarting;
    return;
  }

  const startupPromise = (async () => {
    const redis = new Redis(connection);
    const subscriber = new Redis(connection);

    redis.config("SET", "notify-keyspace-events", "KEA").catch((err) => {
      console.warn("⚠️ \"SET notify-keyspace-events KEA\" failed:", err.message);
    });

    subscriber.on("pmessage", async (_pattern, _channel, key) => {
      if (key.startsWith(CELERY_TASK_META_PREFIX)) {
        const taskId = key.slice(CELERY_TASK_META_PREFIX.length);
        const raw = await redis.get(key);

        await processCeleryTaskMeta(taskId, raw);
      }
    });

    try {
      await subscriber.psubscribe("__keyevent@0__:set");

      globalRedisSub.redisTaskSubscriberStarted = true;

      console.log("✅ Subscribed to Redis SET events");

      void reconcilePendingTasks().catch((error) => {
        console.warn("⚠️ Failed to reconcile pending tasks after Redis subscriber startup:", error);
      });
    } catch (error) {
      redis.disconnect();
      subscriber.disconnect();

      throw error;
    }
  })();

  globalRedisSub.redisTaskSubscriberStarting = startupPromise;

  try {
    await startupPromise;
  } finally {
    globalRedisSub.redisTaskSubscriberStarting = undefined;
  }
}
