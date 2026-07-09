import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate as waitForImmediate } from "node:timers/promises";
import { setTimeout as waitForTimeout } from "node:timers/promises";

import { swrCache } from "@/lib/cache-core";

function createDeferredPromise<TValue>() {
  let resolve!: (value: TValue | PromiseLike<TValue>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<TValue>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    reject,
    resolve,
  };
}

test("swrCache returns cached value on a fresh hit without rerunning the loader", async () => {
  let calls = 0;
  const cachedLoader = swrCache(
    async (query: string) => {
      calls += 1;

      return `${query}:${calls}`;
    },
    {
      keyParts: ["cache-test", "fresh-hit"],
      maxAgeSeconds: 60,
    },
  );

  assert.equal(await cachedLoader("alpha"), "alpha:1");
  assert.equal(await cachedLoader("alpha"), "alpha:1");
  assert.equal(calls, 1);
});

test("swrCache returns stale data immediately and refreshes it in the background", async () => {
  let calls = 0;
  const refreshDeferred = createDeferredPromise<string>();
  const cachedLoader = swrCache(
    async (query: string) => {
      calls += 1;

      if (calls === 1) {
        return `${query}:stale`;
      }

      return refreshDeferred.promise;
    },
    {
      keyParts: ["cache-test", "stale-refresh"],
      maxAgeSeconds: 0,
    },
  );

  assert.equal(await cachedLoader("alpha"), "alpha:stale");
  await waitForTimeout(5);
  assert.equal(await cachedLoader("alpha"), "alpha:stale");
  assert.equal(calls, 2);

  refreshDeferred.resolve("alpha:fresh");
  await waitForImmediate();

  assert.equal(await cachedLoader("alpha"), "alpha:fresh");
});

test("swrCache dedupes background refreshes per full cache key", async () => {
  let calls = 0;
  const refreshDeferred = createDeferredPromise<string>();
  const cachedLoader = swrCache(
    async (query: string) => {
      calls += 1;

      if (calls === 1) {
        return `${query}:stale`;
      }

      return refreshDeferred.promise;
    },
    {
      keyParts: ["cache-test", "refresh-dedupe"],
      maxAgeSeconds: 0,
    },
  );

  assert.equal(await cachedLoader("alpha"), "alpha:stale");
  await waitForTimeout(5);
  assert.equal(await cachedLoader("alpha"), "alpha:stale");
  assert.equal(await cachedLoader("alpha"), "alpha:stale");
  assert.equal(calls, 2);

  refreshDeferred.resolve("alpha:fresh");
  await waitForImmediate();
});

test("swrCache keeps stale data after a failed refresh and retries on a later request", async () => {
  let calls = 0;
  const refreshFailure = createDeferredPromise<string>();
  const refreshSuccess = createDeferredPromise<string>();
  const refreshErrors: unknown[] = [];
  const cachedLoader = swrCache(
    async (query: string) => {
      calls += 1;

      if (calls === 1) {
        return `${query}:stale`;
      }

      if (calls === 2) {
        return refreshFailure.promise;
      }

      return refreshSuccess.promise;
    },
    {
      keyParts: ["cache-test", "refresh-error"],
      maxAgeSeconds: 0,
      onRefreshError(error) {
        refreshErrors.push(error);
      },
    },
  );

  assert.equal(await cachedLoader("alpha"), "alpha:stale");
  await waitForTimeout(5);
  assert.equal(await cachedLoader("alpha"), "alpha:stale");

  const refreshError = new Error("refresh failed");

  refreshFailure.reject(refreshError);
  await waitForImmediate();

  assert.deepEqual(refreshErrors, [refreshError]);
  assert.equal(await cachedLoader("alpha"), "alpha:stale");
  assert.equal(calls, 3);

  refreshSuccess.resolve("alpha:fresh");
  await waitForImmediate();

  assert.equal(await cachedLoader("alpha"), "alpha:fresh");
});

test("swrCache namespaces keys with static keyParts and runtime arguments", async () => {
  const sharedLoader = async (query: string) => query;
  const homePageSourcesCache = swrCache(sharedLoader, {
    getKeyArgs: (searchQuery: string) => [searchQuery],
    keyParts: ["home-page-stats", "sources"],
    maxAgeSeconds: 60,
  });
  const otherNamespaceCache = swrCache(sharedLoader, {
    getKeyArgs: (searchQuery: string) => [searchQuery],
    keyParts: ["another-scope", "sources"],
    maxAgeSeconds: 60,
  });

  let homePageCalls = 0;
  let otherNamespaceCalls = 0;
  const instrumentedHomePageCache = swrCache(
    async (query: string) => {
      homePageCalls += 1;

      return homePageSourcesCache(query);
    },
    {
      getKeyArgs: (searchQuery: string) => [searchQuery],
      keyParts: ["cache-test", "namespaced-home-page"],
      maxAgeSeconds: 60,
    },
  );
  const instrumentedOtherNamespaceCache = swrCache(
    async (query: string) => {
      otherNamespaceCalls += 1;

      return otherNamespaceCache(query);
    },
    {
      getKeyArgs: (searchQuery: string) => [searchQuery],
      keyParts: ["cache-test", "namespaced-other"],
      maxAgeSeconds: 60,
    },
  );

  assert.equal(await instrumentedHomePageCache("alpha"), "alpha");
  assert.equal(await instrumentedHomePageCache("alpha"), "alpha");
  assert.equal(await instrumentedOtherNamespaceCache("alpha"), "alpha");
  assert.equal(await instrumentedOtherNamespaceCache("alpha"), "alpha");
  assert.equal(homePageCalls, 1);
  assert.equal(otherNamespaceCalls, 1);
});
