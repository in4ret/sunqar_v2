import "server-only";

import Redis from "ioredis";

import { formatLogMessage } from "@/lib/logs";
import {
  CELERY_TASK_META_PREFIX,
  processCeleryTaskMeta,
  reconcilePendingTasks,
} from "@/lib/redis/celery-task-meta";
import { buildRedisTaskMetaSetPattern } from "@/lib/redis/redis-sub-helpers";

const REDIS_RECONCILE_INTERVAL_MS = 300_000;

type GlobalRedisSubState = {
  redisTaskSubscriberStarted?: boolean;
  redisTaskSubscriberStarting?: Promise<void>;
  redisTaskSubscriberCleanup?: () => Promise<void>;
};

const globalRedisSub = globalThis as typeof globalThis & GlobalRedisSubState;

export async function startRedisSub() {
  if (globalRedisSub.redisTaskSubscriberStarted) {
    console.log(formatLogMessage("ℹ️ Redis task subscriber already started"));
    return;
  }

  const connection = process.env.REDIS_CONNECTION;

  if (!connection) {
    console.warn(formatLogMessage("⚠️ REDIS_CONNECTION is not set, Redis task subscriber skipped"));
    return;
  }

  if (globalRedisSub.redisTaskSubscriberStarting) {
    await globalRedisSub.redisTaskSubscriberStarting;
    return;
  }

  const startupPromise = (async () => {
    const redis = new Redis(connection);
    const subscriber = new Redis(connection);
    const subscriptionPattern = buildRedisTaskMetaSetPattern(connection);
    let reconcileIntervalId: ReturnType<typeof setInterval> | null = null;

    redis.config("SET", "notify-keyspace-events", "KEA").catch((err) => {
      console.warn(formatLogMessage("⚠️ \"SET notify-keyspace-events KEA\" failed:"), err.message);
    });

    subscriber.on("pmessage", async (_pattern, _channel, key) => {
      if (key.startsWith(CELERY_TASK_META_PREFIX)) {
        const taskId = key.slice(CELERY_TASK_META_PREFIX.length);
        const raw = await redis.get(key);

        await processCeleryTaskMeta(taskId, raw);
      }
    });

    try {
      await subscriber.psubscribe(subscriptionPattern);

      globalRedisSub.redisTaskSubscriberStarted = true;
      globalRedisSub.redisTaskSubscriberCleanup = async () => {
        if (reconcileIntervalId) {
          clearInterval(reconcileIntervalId);
          reconcileIntervalId = null;
        }

        subscriber.disconnect();
        redis.disconnect();
      };

      console.log(formatLogMessage(`✅ Subscribed to Redis SET events on ${subscriptionPattern}`));

      void reconcilePendingTasks().catch((error) => {
        console.warn(
          formatLogMessage("⚠️ Failed to reconcile pending tasks after Redis subscriber startup:"),
          error,
        );
      });

      reconcileIntervalId = setInterval(() => {
        void reconcilePendingTasks().catch((error) => {
          console.warn(formatLogMessage("⚠️ Failed to reconcile pending tasks on interval:"), error);
        });
      }, REDIS_RECONCILE_INTERVAL_MS);
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
