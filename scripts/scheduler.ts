import * as nextEnv from "@next/env";

import { formatLogMessage } from "@/lib/logs";

const POLL_INTERVAL_MS = 30_000;

const loadEnvConfig =
  "loadEnvConfig" in nextEnv && typeof nextEnv.loadEnvConfig === "function"
    ? nextEnv.loadEnvConfig
    : "default" in nextEnv &&
        nextEnv.default &&
        typeof nextEnv.default === "object" &&
        "loadEnvConfig" in nextEnv.default &&
        typeof nextEnv.default.loadEnvConfig === "function"
      ? nextEnv.default.loadEnvConfig
      : null;

if (loadEnvConfig === null) {
  throw new TypeError("Failed to resolve loadEnvConfig from @next/env.");
}

loadEnvConfig(process.cwd());

type SchedulerModule = typeof import("../src/lib/reports/reports-scheduler");

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function processReport(
  scheduler: SchedulerModule,
  report: {
    active: boolean;
    id: string;
    nextRunAt: Date | null;
  },
) {
  if (report.nextRunAt === null) {
    const nextRunAt = await scheduler.calcNextRunAt(report.id);
    const result = await scheduler.updateReportNextRunAt({
      id: report.id,
      nextRunAt,
    });

    if (result.error) {
      console.error(formatLogMessage(
        `[scheduler] Failed to initialize nextRunAt for report ${report.id}.`,
      ));
      return;
    }

    console.log(formatLogMessage(
      `[scheduler] Initialized nextRunAt for report ${report.id}: ${nextRunAt?.toISOString() ?? "null"}.`,
    ));
    return;
  }

  if (!report.active || report.nextRunAt.getTime() > Date.now()) {
    return;
  }

  const nextRunAt = await scheduler.calcNextRunAt(report.id);
  const updateResult = await scheduler.updateReportNextRunAt({
    id: report.id,
    nextRunAt,
  });

  if (updateResult.error) {
    console.error(formatLogMessage(
      `[scheduler] Failed to update nextRunAt for due report ${report.id}.`,
    ));
    return;
  }

  const runItem = await scheduler.getReportRunItemById(report.id);

  if (!runItem) {
    console.error(formatLogMessage(
      `[scheduler] Failed to load run payload for report ${report.id}.`,
    ));
    return;
  }

  const triggerResult = await scheduler.triggerReportGeneration(runItem);

  if (triggerResult.error) {
    console.error(formatLogMessage(
      `[scheduler] Failed to generate report ${report.id}: ${triggerResult.error}.`,
    ));
    return;
  }

  console.log(formatLogMessage(
    `[scheduler] Triggered report ${report.id}; nextRunAt=${nextRunAt?.toISOString() ?? "null"}.`,
  ));
}

async function runSchedulerPass(scheduler: SchedulerModule) {
  const reports = await scheduler.listSchedulerReports();

  for (const report of reports) {
    try {
      await processReport(scheduler, report);
    } catch (error) {
      console.error(formatLogMessage(
        `[scheduler] Unexpected error while processing report ${report.id}.`,
      ), error);
    }
  }
}

async function main() {
  const scheduler = await import("../src/lib/reports/reports-scheduler");

  console.log(formatLogMessage(
    `[scheduler] Started with ${POLL_INTERVAL_MS / 1000}s polling interval.`,
  ));

  while (true) {
    try {
      await runSchedulerPass(scheduler);
    } catch (error) {
      console.error(formatLogMessage("[scheduler] Pass failed."), error);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  console.error(formatLogMessage("[scheduler] Fatal error."), error);
  process.exit(1);
});
