import assert from "node:assert/strict";
import test from "node:test";

import * as reportPeriodModule from "./report-period";
import * as reportSchedulerSharedModule from "./report-scheduler-shared";

const reportPeriod =
  "default" in reportPeriodModule && reportPeriodModule.default
    ? reportPeriodModule.default
    : reportPeriodModule;
const reportSchedulerShared =
  "default" in reportSchedulerSharedModule && reportSchedulerSharedModule.default
    ? reportSchedulerSharedModule.default
    : reportSchedulerSharedModule;

const { parseStoredReportPeriod, REPORT_SCHEDULE_TIME_ZONE } = reportPeriod;
const { calculateNextRunAtForPeriod } = reportSchedulerShared;

const CREATED_AT = new Date("2026-07-05T12:00:00.000Z");
const NOW = new Date("2026-07-12T03:00:00.000Z");

test("calculateNextRunAtForPeriod returns a runnable date for legacy daily schedules missing times", () => {
  const period = parseStoredReportPeriod(
    JSON.stringify({
      frequency: "daily",
      interval: 1,
      times: [],
    }),
    {
      fallbackDate: NOW,
      timeZone: REPORT_SCHEDULE_TIME_ZONE,
    },
  );

  assert.equal(
    calculateNextRunAtForPeriod(period, CREATED_AT, NOW, REPORT_SCHEDULE_TIME_ZONE)?.toISOString(),
    "2026-07-12T04:00:00.000Z",
  );
});

test("calculateNextRunAtForPeriod returns a runnable date for legacy weekly schedules missing weekdays and times", () => {
  const period = parseStoredReportPeriod(
    JSON.stringify({
      frequency: "weekly",
      interval: 1,
      times: [],
    }),
    {
      fallbackDate: NOW,
      timeZone: REPORT_SCHEDULE_TIME_ZONE,
    },
  );

  assert.equal(
    calculateNextRunAtForPeriod(period, CREATED_AT, NOW, REPORT_SCHEDULE_TIME_ZONE)?.toISOString(),
    "2026-07-12T04:00:00.000Z",
  );
});

test("calculateNextRunAtForPeriod returns a runnable date for legacy monthly schedules missing monthDays and times", () => {
  const period = parseStoredReportPeriod(
    JSON.stringify({
      frequency: "monthly",
      interval: 1,
      times: [],
    }),
    {
      fallbackDate: NOW,
      timeZone: REPORT_SCHEDULE_TIME_ZONE,
    },
  );

  assert.equal(
    calculateNextRunAtForPeriod(period, CREATED_AT, NOW, REPORT_SCHEDULE_TIME_ZONE)?.toISOString(),
    "2026-07-12T04:00:00.000Z",
  );
});
