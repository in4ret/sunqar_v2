import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNewsWhereClause,
  resolveNewsAggregateExecutionMode,
  shouldUseCachedNewsAggregateQuery,
} from "@/lib/news/news-filters";

test("buildNewsWhereClause clamps empty to to the current time", () => {
  const now = new Date("2026-07-07T12:34:00Z");
  const nowEpochSeconds = Math.floor(now.getTime() / 1000);

  assert.equal(
    buildNewsWhereClause("", [], "", "", [], { now }),
    ` WHERE publishedat < ${nowEpochSeconds + 60}`,
  );
});

test("buildNewsWhereClause keeps explicit to unchanged", () => {
  assert.equal(
    buildNewsWhereClause("", [], "", "200"),
    " WHERE publishedat < 260",
  );
});

test("buildNewsWhereClause combines from with implicit now upper bound", () => {
  const now = new Date("2026-07-07T12:34:00Z");
  const nowEpochSeconds = Math.floor(now.getTime() / 1000);

  assert.equal(
    buildNewsWhereClause("", [], "100", "", [], { now }),
    ` WHERE publishedat >= 100 AND publishedat < ${nowEpochSeconds + 60}`,
  );
});

test("buildNewsWhereClause drops explicit reversed date ranges", () => {
  assert.equal(buildNewsWhereClause("", [], "300", "200"), "");
});

test("buildNewsWhereClause keeps contradictory conditions for future from with empty to", () => {
  const now = new Date("2026-07-07T12:34:00Z");
  const nowEpochSeconds = Math.floor(now.getTime() / 1000);

  assert.equal(
    buildNewsWhereClause("", [], String(nowEpochSeconds + 3600), "", [], { now }),
    ` WHERE publishedat >= ${nowEpochSeconds + 3600} AND publishedat < ${nowEpochSeconds + 60}`,
  );
});

test("shouldUseCachedNewsAggregateQuery only caches explicit upper bounds", () => {
  assert.equal(shouldUseCachedNewsAggregateQuery({ to: "123" }), true);
  assert.equal(shouldUseCachedNewsAggregateQuery({ to: "" }), false);
});

test("resolveNewsAggregateExecutionMode uses cached path only for explicit to", () => {
  assert.equal(resolveNewsAggregateExecutionMode({ to: "123" }), "cached");
  assert.equal(resolveNewsAggregateExecutionMode({ to: "" }), "direct");
});
