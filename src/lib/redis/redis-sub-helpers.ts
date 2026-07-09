const DEFAULT_REDIS_DATABASE_INDEX = 0;

export function resolveRedisDatabaseIndex(connection: string) {
  try {
    const parsedUrl = new URL(connection);
    const pathname = parsedUrl.pathname.trim();
    const databaseValue = pathname.startsWith("/") ? pathname.slice(1) : pathname;

    if (!databaseValue) {
      return DEFAULT_REDIS_DATABASE_INDEX;
    }

    const databaseIndex = Number.parseInt(databaseValue, 10);

    if (!Number.isSafeInteger(databaseIndex) || databaseIndex < 0) {
      return DEFAULT_REDIS_DATABASE_INDEX;
    }

    return databaseIndex;
  } catch {
    return DEFAULT_REDIS_DATABASE_INDEX;
  }
}

export function buildRedisTaskMetaSetPattern(connection: string) {
  return `__keyevent@${resolveRedisDatabaseIndex(connection)}__:set`;
}
