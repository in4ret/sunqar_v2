import assert from "node:assert/strict";
import test from "node:test";

import { isInternalTaskNavigationUrl } from "@/lib/tasks/task-navigation";

test("isInternalTaskNavigationUrl detects internal comments routes", () => {
  assert.equal(isInternalTaskNavigationUrl("/comments/text?p=video-1"), true);
  assert.equal(isInternalTaskNavigationUrl("https://example.com/report.pdf"), false);
  assert.equal(isInternalTaskNavigationUrl(null), false);
});
