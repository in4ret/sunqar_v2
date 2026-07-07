import assert from "node:assert/strict";
import test from "node:test";

import {
  formatEpochSecondsToDateTimeLocalValue,
  getDefaultNewsPageSearchFromValue,
  parseDateTimeLocalValueToEpochSeconds,
  resolveDefaultSearchDateRange,
  resolveSubmittedSearchDateRange,
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

test("resolveDefaultSearchDateRange fills from when both range values are empty", () => {
  assert.deepEqual(resolveDefaultSearchDateRange({ from: "", to: "" }, new Date(2026, 6, 7, 13, 45)), {
    from: "2026-07-01T00:00",
    to: "",
  });
});

test("resolveDefaultSearchDateRange preserves explicit from value", () => {
  assert.deepEqual(
    resolveDefaultSearchDateRange(
      { from: "2026-07-03T09:30", to: "" },
      new Date(2026, 6, 7, 13, 45),
    ),
    {
      from: "2026-07-03T09:30",
      to: "",
    },
  );
});

test("resolveDefaultSearchDateRange does not backfill from when only to is provided", () => {
  assert.deepEqual(
    resolveDefaultSearchDateRange(
      { from: "", to: "2026-07-07T18:00" },
      new Date(2026, 6, 7, 13, 45),
    ),
    {
      from: "",
      to: "2026-07-07T18:00",
    },
  );
});

test("resolveSubmittedSearchDateRange returns the same default from for field and query parameter", () => {
  assert.deepEqual(
    resolveSubmittedSearchDateRange({ from: "", to: "" }, new Date(2026, 6, 7, 13, 45)),
    {
      from: "2026-07-01T00:00",
      fromEpochSeconds: String(parseDateTimeLocalValueToEpochSeconds("2026-07-01T00:00")),
      to: "",
      toEpochSeconds: "",
    },
  );
});

test("resolveSubmittedSearchDateRange preserves explicit values without backfilling", () => {
  assert.deepEqual(
    resolveSubmittedSearchDateRange(
      { from: "", to: "2026-07-07T18:00" },
      new Date(2026, 6, 7, 13, 45),
    ),
    {
      from: "",
      fromEpochSeconds: "",
      to: "2026-07-07T18:00",
      toEpochSeconds: String(parseDateTimeLocalValueToEpochSeconds("2026-07-07T18:00")),
    },
  );
});

test("getDefaultNewsPageSearchFromValue uses previous monday midnight on sunday", () => {
  assert.equal(getDefaultNewsPageSearchFromValue(new Date(2026, 6, 12, 16, 20)), "2026-07-06T00:00");
});
