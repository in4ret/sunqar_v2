import assert from "node:assert/strict";
import test from "node:test";

import * as reportPeriodModule from "./report-period";

const reportPeriod =
  "default" in reportPeriodModule && reportPeriodModule.default
    ? reportPeriodModule.default
    : reportPeriodModule;
const {
  parseStoredReportPeriod,
  REPORT_SCHEDULE_TIME_ZONE,
  serializeStoredReportPeriod,
} = reportPeriod;

const FALLBACK_DATE = new Date("2026-07-12T03:30:00.000Z");

test("serializeStoredReportPeriod persists default daily times for incomplete schedules", () => {
  assert.equal(
    serializeStoredReportPeriod(
      {
        frequency: "daily",
        interval: 1,
        times: [],
      },
      {
        fallbackDate: FALLBACK_DATE,
        timeZone: REPORT_SCHEDULE_TIME_ZONE,
      },
    ),
    JSON.stringify({
      frequency: "daily",
      interval: 1,
      times: ["09:00"],
    }),
  );
});

test("serializeStoredReportPeriod persists default weekly weekday and time for incomplete schedules", () => {
  assert.equal(
    serializeStoredReportPeriod(
      {
        frequency: "weekly",
        interval: 1,
        times: [],
      },
      {
        fallbackDate: FALLBACK_DATE,
        timeZone: REPORT_SCHEDULE_TIME_ZONE,
      },
    ),
    JSON.stringify({
      frequency: "weekly",
      interval: 1,
      times: ["09:00"],
      weekdays: ["sunday"],
    }),
  );
});

test("parseStoredReportPeriod fills monthly defaults for legacy stored payloads", () => {
  assert.deepEqual(
    parseStoredReportPeriod(
      JSON.stringify({
        frequency: "monthly",
        interval: 1,
        times: [],
      }),
      {
        fallbackDate: FALLBACK_DATE,
        timeZone: REPORT_SCHEDULE_TIME_ZONE,
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
