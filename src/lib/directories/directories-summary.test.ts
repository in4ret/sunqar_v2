import assert from "node:assert/strict";
import test from "node:test";

import type { DirectoriesSummary } from "./directories-summary";

function formatDirectoriesSummary(summary: DirectoriesSummary) {
  return [
    { key: "sources", value: summary.sourcesCount },
    { key: "posts", value: summary.postsCount },
  ];
}

test("formatDirectoriesSummary keeps sources and posts counts in stable order", () => {
  assert.deepEqual(
    formatDirectoriesSummary({
      postsCount: 17688,
      sourcesCount: 424,
    }),
    [
      { key: "sources", value: 424 },
      { key: "posts", value: 17688 },
    ],
  );
});
