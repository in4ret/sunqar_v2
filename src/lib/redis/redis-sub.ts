import "server-only";

import Redis from "ioredis";

import { CELERY_TASK_META_PREFIX, processCeleryTaskMeta } from "@/lib/redis/celery-task-meta";

type GlobalRedisSubState = {
  redisTaskSubscriberStarted?: boolean;
  redisTaskSubscriberCleanup?: () => Promise<void>;
};

const globalRedisSub = globalThis as typeof globalThis & GlobalRedisSubState;

export function startRedisSub() {
  if (globalRedisSub.redisTaskSubscriberStarted) {
    console.log("ℹ️ Redis task subscriber already started");
    return;
  }

  globalRedisSub.redisTaskSubscriberStarted = true;

  const connection = process.env.REDIS_CONNECTION;

  if (!connection) {
    console.warn("⚠️ REDIS_CONNECTION is not set, Redis task subscriber skipped");
    return;
  }

  const redis = new Redis(connection);
  const subscriber = new Redis(connection);

  redis.config("SET", "notify-keyspace-events", "KEA").catch((err) => {
    console.warn("⚠️ \"SET notify-keyspace-events KEA\" failed:", err.message);
  });

  subscriber.psubscribe("__keyevent@0__:set", (err) => {
    if (err) {
      console.error("❌ Error subscribing to Redis events:", err);
    } else {
      console.log("✅ Subscribed to Redis SET events");
    }
  });

  subscriber.on("pmessage", async (_pattern, _channel, key) => {
    if (key.startsWith(CELERY_TASK_META_PREFIX)) {
      const taskId = key.slice(CELERY_TASK_META_PREFIX.length);
      const raw = await redis.get(key);

      await processCeleryTaskMeta(taskId, raw);
    }
  });
}
