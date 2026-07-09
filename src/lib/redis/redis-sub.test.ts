import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRedisTaskMetaSetPattern,
  resolveRedisDatabaseIndex,
} from "@/lib/redis/redis-sub-helpers";

test("resolveRedisDatabaseIndex defaults to 0 when db is omitted", () => {
  assert.equal(resolveRedisDatabaseIndex("redis://localhost:6379"), 0);
});

test("resolveRedisDatabaseIndex reads numeric db from connection string", () => {
  assert.equal(resolveRedisDatabaseIndex("redis://localhost:6379/5"), 5);
  assert.equal(resolveRedisDatabaseIndex("redis://localhost:6379/12"), 12);
});

test("buildRedisTaskMetaSetPattern builds db-specific keyevent pattern", () => {
  assert.equal(
    buildRedisTaskMetaSetPattern("redis://localhost:6379"),
    "__keyevent@0__:set",
  );
  assert.equal(
    buildRedisTaskMetaSetPattern("redis://localhost:6379/5"),
    "__keyevent@5__:set",
  );
  assert.equal(
    buildRedisTaskMetaSetPattern("redis://localhost:6379/12"),
    "__keyevent@12__:set",
  );
});
