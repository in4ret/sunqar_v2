import {
  calcNextRunAt,
  getReportRunItemById,
  listSchedulerReports,
  triggerReportGeneration,
  updateReportNextRunAt,
} from "../src/lib/reports/reports-scheduler";

const POLL_INTERVAL_MS = 30_000;

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function processReport(report: {
  active: boolean;
  id: string;
  nextRunAt: Date | null;
}) {
  if (report.nextRunAt === null) {
    const nextRunAt = await calcNextRunAt(report.id);
    const result = await updateReportNextRunAt({
      id: report.id,
      nextRunAt,
    });

    if (result.error) {
      console.error(`[scheduler] Failed to initialize nextRunAt for report ${report.id}.`);
      return;
    }

    console.log(
      `[scheduler] Initialized nextRunAt for report ${report.id}: ${nextRunAt?.toISOString() ?? "null"}.`,
    );
    return;
  }

  if (!report.active || report.nextRunAt.getTime() > Date.now()) {
    return;
  }

  const nextRunAt = await calcNextRunAt(report.id);
  const updateResult = await updateReportNextRunAt({
    id: report.id,
    nextRunAt,
  });

  if (updateResult.error) {
    console.error(`[scheduler] Failed to update nextRunAt for due report ${report.id}.`);
    return;
  }

  const runItem = await getReportRunItemById(report.id);

  if (!runItem) {
    console.error(`[scheduler] Failed to load run payload for report ${report.id}.`);
    return;
  }

  const triggerResult = await triggerReportGeneration(runItem);

  if (triggerResult.error) {
    console.error(
      `[scheduler] Failed to generate report ${report.id}: ${triggerResult.error}.`,
    );
    return;
  }

  console.log(
    `[scheduler] Triggered report ${report.id}; nextRunAt=${nextRunAt?.toISOString() ?? "null"}.`,
  );
}

async function runSchedulerPass() {
  const reports = await listSchedulerReports();

  for (const report of reports) {
    try {
      await processReport(report);
    } catch (error) {
      console.error(`[scheduler] Unexpected error while processing report ${report.id}.`, error);
    }
  }
}

async function main() {
  console.log(`[scheduler] Started with ${POLL_INTERVAL_MS / 1000}s polling interval.`);

  while (true) {
    const startedAt = new Date();

    console.log(`[scheduler] Pass started at ${startedAt.toISOString()}.`);

    try {
      await runSchedulerPass();
    } catch (error) {
      console.error("[scheduler] Pass failed.", error);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  console.error("[scheduler] Fatal error.");
  console.error(error);
  process.exit(1);
});
