import assert from "node:assert/strict";
import test from "node:test";

import {
  formatEpochSecondsToDateTimeLocalValue,
  parseDateTimeLocalValueToEpochSeconds,
} from "./date-time-local";

test("formatEpochSecondsToDateTimeLocalValue returns an empty string for invalid values", () => {
  assert.equal(formatEpochSecondsToDateTimeLocalValue(""), "");
  assert.equal(formatEpochSecondsToDateTimeLocalValue("not-an-epoch"), "");
});

test("datetime-local values round-trip through epoch seconds without local-time drift", () => {
  const inputValue = "2026-07-06T14:35";
  const epochSeconds = parseDateTimeLocalValueToEpochSeconds(inputValue);

  assert.notEqual(epochSeconds, null);
  assert.equal(formatEpochSecondsToDateTimeLocalValue(String(epochSeconds)), inputValue);
});
