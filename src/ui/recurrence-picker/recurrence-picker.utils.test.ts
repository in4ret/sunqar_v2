import assert from "node:assert/strict";
import test from "node:test";

import * as recurrencePickerUtilsModule from "./recurrence-picker.utils";

const recurrencePickerUtils =
  "default" in recurrencePickerUtilsModule && recurrencePickerUtilsModule.default
    ? recurrencePickerUtilsModule.default
    : recurrencePickerUtilsModule;
const { normalizeRecurrenceValue } = recurrencePickerUtils;

const ALMATY_TIME_ZONE = "Asia/Almaty";
const FALLBACK_DATE = new Date("2026-07-12T03:30:00.000Z");

test("normalizeRecurrenceValue defaults daily times to 09:00", () => {
  assert.deepEqual(
    normalizeRecurrenceValue(
      {
        frequency: "daily",
        interval: 1,
        times: [],
      },
      {
        fallbackDate: FALLBACK_DATE,
        timeZone: ALMATY_TIME_ZONE,
      },
    ),
    {
      frequency: "daily",
      interval: 1,
      monthDays: undefined,
      times: ["09:00"],
      weekdays: undefined,
    },
  );
});

test("normalizeRecurrenceValue defaults weekly times and weekdays from the local fallback date", () => {
  assert.deepEqual(
    normalizeRecurrenceValue(
      {
        frequency: "weekly",
        interval: 1,
        times: [],
      },
      {
        fallbackDate: FALLBACK_DATE,
        timeZone: ALMATY_TIME_ZONE,
      },
    ),
    {
      frequency: "weekly",
      interval: 1,
      monthDays: undefined,
      times: ["09:00"],
      weekdays: ["sunday"],
    },
  );
});

test("normalizeRecurrenceValue defaults monthly times and monthDays from the local fallback date", () => {
  assert.deepEqual(
    normalizeRecurrenceValue(
      {
        frequency: "monthly",
        interval: 1,
        times: [],
      },
      {
        fallbackDate: FALLBACK_DATE,
        timeZone: ALMATY_TIME_ZONE,
      },
    ),
    {
      frequency: "monthly",
      interval: 1,
      monthDays: [12],
      times: ["09:00"],
      weekdays: undefined,
    },
  );
});

test("normalizeRecurrenceValue preserves fully specified recurrence values", () => {
  assert.deepEqual(
    normalizeRecurrenceValue(
      {
        frequency: "weekly",
        interval: 2,
        monthDays: [3],
        times: ["18:30"],
        weekdays: ["monday", "friday"],
      },
      {
        fallbackDate: FALLBACK_DATE,
        timeZone: ALMATY_TIME_ZONE,
      },
    ),
    {
      frequency: "weekly",
      interval: 2,
      monthDays: [3],
      times: ["18:30"],
      weekdays: ["monday", "friday"],
    },
  );
});
