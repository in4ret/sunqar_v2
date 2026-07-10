export const ONE_HOUR_REVALIDATE = 60 * 60;

type SwrCacheEntry<TValue> = {
  cachedAt: number;
  value: TValue;
};

type SwrCacheOptions<TArgs extends readonly unknown[]> = {
  getKeyArgs?: (...args: TArgs) => readonly unknown[];
  keyParts: readonly string[];
  maxAgeSeconds: number;
  onRefreshError?: (error: unknown, ...args: TArgs) => void | Promise<void>;
};

export type SwrCachedLoader<TArgs extends readonly unknown[], TValue> = ((
  ...args: TArgs
) => Promise<TValue>) & {
  clear: (...args: TArgs) => void;
  refresh: (...args: TArgs) => Promise<TValue>;
};

type GlobalSwrCacheState = {
  swrCacheEntries?: Map<string, SwrCacheEntry<unknown>>;
  swrCacheRefreshes?: Map<string, Promise<void>>;
};

const globalSwrCacheState = globalThis as typeof globalThis & GlobalSwrCacheState;

function getSwrCacheEntries() {
  if (!globalSwrCacheState.swrCacheEntries) {
    globalSwrCacheState.swrCacheEntries = new Map();
  }

  return globalSwrCacheState.swrCacheEntries;
}

function getSwrCacheRefreshes() {
  if (!globalSwrCacheState.swrCacheRefreshes) {
    globalSwrCacheState.swrCacheRefreshes = new Map();
  }

  return globalSwrCacheState.swrCacheRefreshes;
}

function serializeSwrCacheKeyPart(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return `string:${JSON.stringify(value)}`;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return `${typeof value}:${String(value)}`;
  }

  if (typeof value === "symbol") {
    return `symbol:${String(value)}`;
  }

  if (typeof value === "function") {
    return `function:${value.name || "anonymous"}`;
  }

  if (value instanceof Date) {
    return `date:${value.toISOString()}`;
  }

  if (Array.isArray(value)) {
    return `array:[${value.map((item) => serializeSwrCacheKeyPart(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    return `object:{${entries
      .map(([key, itemValue]) => `${JSON.stringify(key)}:${serializeSwrCacheKeyPart(itemValue)}`)
      .join(",")}}`;
  }

  return `unknown:${String(value)}`;
}

function buildSwrCacheKey(keyParts: readonly string[], keyArgs: readonly unknown[]) {
  return [...keyParts, ...keyArgs].map((part) => serializeSwrCacheKeyPart(part)).join("|");
}

export function swrCache<TArgs extends readonly unknown[], TValue>(
  loader: (...args: TArgs) => Promise<TValue>,
  options: SwrCacheOptions<TArgs>,
): SwrCachedLoader<TArgs, TValue> {
  const cacheEntries = getSwrCacheEntries();
  const cacheRefreshes = getSwrCacheRefreshes();
  const maxAgeMilliseconds = options.maxAgeSeconds * 1000;
  const getKeyArgs = (...args: TArgs) => options.getKeyArgs ? options.getKeyArgs(...args) : args;
  const getCacheKey = (...args: TArgs) => buildSwrCacheKey(options.keyParts, getKeyArgs(...args));

  const clear = (...args: TArgs) => {
    const cacheKey = getCacheKey(...args);

    cacheEntries.delete(cacheKey);
    cacheRefreshes.delete(cacheKey);
  };

  const refresh = async (...args: TArgs): Promise<TValue> => {
    const cacheKey = getCacheKey(...args);
    const value = await loader(...args);

    cacheEntries.set(cacheKey, {
      cachedAt: Date.now(),
      value,
    });
    cacheRefreshes.delete(cacheKey);

    return value;
  };

  const cachedLoader = async (...args: TArgs): Promise<TValue> => {
    const cacheKey = getCacheKey(...args);
    const cachedEntry = cacheEntries.get(cacheKey) as SwrCacheEntry<TValue> | undefined;

    if (!cachedEntry) {
      return refresh(...args);
    }

    const ageMilliseconds = Date.now() - cachedEntry.cachedAt;

    if (ageMilliseconds <= maxAgeMilliseconds) {
      return cachedEntry.value;
    }

    if (!cacheRefreshes.has(cacheKey)) {
      const refreshPromise = (async () => {
        try {
          await refresh(...args);
        } catch (error) {
          await options.onRefreshError?.(error, ...args);
        } finally {
          cacheRefreshes.delete(cacheKey);
        }
      })();

      cacheRefreshes.set(cacheKey, refreshPromise);
    }

    return cachedEntry.value;
  };

  cachedLoader.clear = clear;
  cachedLoader.refresh = refresh;

  return cachedLoader;
}
