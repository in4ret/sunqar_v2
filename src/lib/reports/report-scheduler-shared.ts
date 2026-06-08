import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/database";
import { aiModels, reports, tasks, users } from "@/lib/db/schema";
import { publishTaskSnapshotInvalidation } from "@/lib/task-stream-sync";
import type { RecurrenceValue, Weekday } from "@/ui/recurrence-picker/recurrence-picker.types";

import type { ReportBlocks } from "./report-blocks";
import { parseStoredReportPeriod } from "./report-period";

export type ReportRunItem = {
  authorId: string;
  authorName: string;
  blocks: ReportBlocks;
  description: string;
  id: string;
  title: string;
};

export type SchedulerReportItem = {
  active: boolean;
  id: string;
  nextRunAt: Date | null;
};

export type ReportRunErrorCode =
  | "report-not-found"
  | "report-run-request-failed"
  | "report-run-url-missing";

const ALMATY_TIME_ZONE = "Asia/Almaty";
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
const WEEKDAY_NUMBER_BY_NAME: Record<Weekday, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

type LocalDateParts = {
  day: number;
  month: number;
  year: number;
};

type ReportRunItemRow = {
  authorId: string;
  authorName: string | null;
  blocks: ReportBlocks;
  description: string;
  id: string;
  title: string;
};

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const timeZoneName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const match = timeZoneName?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);

  if (!match) {
    return 0;
  }

  const [, sign, hours, minutes = "0"] = match;
  const totalMinutes = Number(hours) * 60 + Number(minutes);

  return (sign === "+" ? 1 : -1) * totalMinutes * 60 * 1000;
}

function getLocalDateParts(date: Date, timeZone: string): LocalDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    day: Number(parts.find((part) => part.type === "day")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    year: Number(parts.find((part) => part.type === "year")?.value),
  };
}

function getDaySerial({ day, month, year }: LocalDateParts) {
  return Math.floor(Date.UTC(year, month - 1, day) / MILLISECONDS_IN_DAY);
}

function getMonthSerial({ month, year }: LocalDateParts) {
  return year * 12 + (month - 1);
}

function getWeekStartSerial(parts: LocalDateParts) {
  const daySerial = getDaySerial(parts);
  const weekdayNumber = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12)).getUTCDay();
  const daysSinceMonday = (weekdayNumber + 6) % 7;

  return daySerial - daysSinceMonday;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
}

function toUtcDateFromLocalTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offset = getTimeZoneOffsetMilliseconds(new Date(utcGuess), timeZone);

  return new Date(utcGuess - offset);
}

function createCandidateDate(
  year: number,
  month: number,
  day: number,
  time: string,
  timeZone: string,
) {
  const [hour, minute] = time.split(":").map(Number);

  return toUtcDateFromLocalTime(year, month, day, hour ?? 0, minute ?? 0, timeZone);
}

function findMatchingTimeOnDay(
  day: LocalDateParts,
  times: string[],
  now: Date,
  timeZone: string,
) {
  for (const time of times) {
    const candidate = createCandidateDate(day.year, day.month, day.day, time, timeZone);

    if (candidate.getTime() > now.getTime()) {
      return candidate;
    }
  }

  return null;
}

function calculateNextDailyRunAt(
  period: RecurrenceValue,
  createdAt: Date,
  now: Date,
  timeZone: string,
) {
  if (period.times.length === 0) {
    return null;
  }

  const createdAtLocal = getLocalDateParts(createdAt, timeZone);
  const nowLocal = getLocalDateParts(now, timeZone);
  const createdAtDaySerial = getDaySerial(createdAtLocal);
  const nowDaySerial = getDaySerial(nowLocal);

  for (let dayOffset = 0; dayOffset <= period.interval; dayOffset += 1) {
    const candidateDaySerial = nowDaySerial + dayOffset;

    if ((candidateDaySerial - createdAtDaySerial) % period.interval !== 0) {
      continue;
    }

    const candidateDay = new Date(Date.UTC(nowLocal.year, nowLocal.month - 1, nowLocal.day + dayOffset, 12));
    const candidateLocal = getLocalDateParts(candidateDay, timeZone);
    const candidate = findMatchingTimeOnDay(candidateLocal, period.times, now, timeZone);

    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function calculateNextWeeklyRunAt(
  period: RecurrenceValue,
  createdAt: Date,
  now: Date,
  timeZone: string,
) {
  if (period.times.length === 0 || !period.weekdays || period.weekdays.length === 0) {
    return null;
  }

  const allowedWeekdays = new Set(period.weekdays.map((weekday) => WEEKDAY_NUMBER_BY_NAME[weekday]));
  const createdAtWeekStartSerial = getWeekStartSerial(getLocalDateParts(createdAt, timeZone));
  const nowLocal = getLocalDateParts(now, timeZone);

  for (let dayOffset = 0; dayOffset < period.interval * 7 + 7; dayOffset += 1) {
    const candidateDay = new Date(Date.UTC(nowLocal.year, nowLocal.month - 1, nowLocal.day + dayOffset, 12));
    const candidateLocal = getLocalDateParts(candidateDay, timeZone);
    const candidateWeekdayNumber = new Date(
      Date.UTC(candidateLocal.year, candidateLocal.month - 1, candidateLocal.day, 12),
    ).getUTCDay();

    if (!allowedWeekdays.has(candidateWeekdayNumber)) {
      continue;
    }

    const candidateWeekStartSerial = getWeekStartSerial(candidateLocal);

    if ((candidateWeekStartSerial - createdAtWeekStartSerial) / 7 % period.interval !== 0) {
      continue;
    }

    const candidate = findMatchingTimeOnDay(candidateLocal, period.times, now, timeZone);

    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function calculateNextMonthlyRunAt(
  period: RecurrenceValue,
  createdAt: Date,
  now: Date,
  timeZone: string,
) {
  if (period.times.length === 0 || !period.monthDays || period.monthDays.length === 0) {
    return null;
  }

  const createdAtMonthSerial = getMonthSerial(getLocalDateParts(createdAt, timeZone));
  const nowLocal = getLocalDateParts(now, timeZone);

  for (let monthOffset = 0; monthOffset <= period.interval; monthOffset += 1) {
    const candidateMonthDate = new Date(Date.UTC(nowLocal.year, nowLocal.month - 1 + monthOffset, 1, 12));
    const candidateMonth = getLocalDateParts(candidateMonthDate, timeZone);
    const candidateMonthSerial = getMonthSerial(candidateMonth);

    if ((candidateMonthSerial - createdAtMonthSerial) % period.interval !== 0) {
      continue;
    }

    const daysInMonth = getDaysInMonth(candidateMonth.year, candidateMonth.month);

    for (const monthDay of period.monthDays) {
      if (monthDay > daysInMonth) {
        continue;
      }

      const candidate = findMatchingTimeOnDay(
        {
          day: monthDay,
          month: candidateMonth.month,
          year: candidateMonth.year,
        },
        period.times,
        now,
        timeZone,
      );

      if (candidate) {
        return candidate;
      }
    }
  }

  return null;
}

export function getReportRunItemBaseQuery() {
  return db
    .select({
      authorId: reports.createdBy,
      authorName: users.displayName,
      blocks: reports.blocks,
      description: reports.description,
      id: reports.id,
      title: reports.title,
    })
    .from(reports)
    .leftJoin(users, eq(reports.createdBy, users.id));
}

export function mapReportRunItem(row: ReportRunItemRow): ReportRunItem {
  const aiModelIds = Array.from(new Set(row.blocks.map((block) => block.aiModel.trim()).filter(Boolean)));
  const aiModelRows = aiModelIds.length
    ? db
        .select({
          id: aiModels.id,
          modelId: aiModels.modelId,
        })
        .from(aiModels)
        .where(inArray(aiModels.id, aiModelIds))
        .all()
    : [];
  const aiModelIdById = new Map(aiModelRows.map((aiModel) => [aiModel.id, aiModel.modelId]));

  return {
    authorId: row.authorId,
    id: row.id,
    title: row.title,
    description: row.description,
    authorName: row.authorName ?? "—",
    blocks: row.blocks.map((block) => ({
      ...block,
      aiModel: aiModelIdById.get(block.aiModel) ?? block.aiModel,
    })) as ReportBlocks,
  };
}

export async function calcNextRunAt(id: string): Promise<Date | null> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    return null;
  }

  const report = db
    .select({
      createdAt: reports.createdAt,
      id: reports.id,
      period: reports.period,
    })
    .from(reports)
    .where(eq(reports.id, normalizedId))
    .get();

  if (!report) {
    return null;
  }

  let period: RecurrenceValue;

  try {
    period = parseStoredReportPeriod(report.period);
  } catch {
    return null;
  }

  const now = new Date();

  if (period.frequency === "weekly") {
    return calculateNextWeeklyRunAt(period, report.createdAt, now, ALMATY_TIME_ZONE);
  }

  if (period.frequency === "monthly") {
    return calculateNextMonthlyRunAt(period, report.createdAt, now, ALMATY_TIME_ZONE);
  }

  return calculateNextDailyRunAt(period, report.createdAt, now, ALMATY_TIME_ZONE);
}

export async function getReportRunItemById(id: string): Promise<ReportRunItem | null> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    return null;
  }

  const row = getReportRunItemBaseQuery()
    .where(eq(reports.id, normalizedId))
    .get();

  if (!row) {
    return null;
  }

  return mapReportRunItem(row);
}

function extractReportTaskId(data: unknown): string | null {
  const taskPayload = Array.isArray(data) ? data[0] : data;

  if (!taskPayload || typeof taskPayload !== "object") {
    return null;
  }

  const taskId = "task_id" in taskPayload ? taskPayload.task_id : null;

  return typeof taskId === "string" && taskId.trim() ? taskId.trim() : null;
}

export async function triggerReportGeneration(report: ReportRunItem): Promise<{
  error: ReportRunErrorCode | null;
}> {
  const generateReportUrl = process.env.GENERATE_REPORT_URL?.trim();

  if (!generateReportUrl) {
    return { error: "report-run-url-missing" };
  }

  const requestBody = {
    id: report.id,
    title: report.title,
    description: report.description,
    author: report.authorName,
    blocks: report.blocks.map((block) => ({
      title: block.title,
      model: block.aiModel,
      prompt: block.prompt,
      sources: block.sources,
      key_words: block.keywords,
    })),
  };
  const astanaTime = new Intl.DateTimeFormat("en-CA", {
    timeZone: ALMATY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());

  try {
    console.log(`[reports] Report generation started at Astana time: ${astanaTime}.`);
    console.log(
      `[reports] Report generation request summary: ${JSON.stringify({
        title: requestBody.title,
        author: requestBody.author,
      })}`,
    );

    const response = await fetch(generateReportUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    if (!response.ok) {
      const responseText = await response.text();

      console.error(
        `Generate report request failed for report ${report.id} with status ${response.status}: ${responseText}`,
      );

      return { error: "report-run-request-failed" };
    }

    const data = await response.json();
    const taskId = extractReportTaskId(data);

    if (!taskId) {
      console.error(`Generate report request for report ${report.id} succeeded without a valid task_id.`, data);

      return { error: "report-run-request-failed" };
    }

    db.insert(tasks)
      .values({
        createdAt: new Date(),
        doneAt: null,
        downloadUrl: null,
        error: null,
        read: false,
        reportId: report.id,
        status: "pending",
        taskId,
        userId: report.authorId,
      })
      .run();

    await publishTaskSnapshotInvalidation(report.authorId);

    // console.log("###", data);
  } catch (error) {
    console.error(`Generate report request failed for report ${report.id}.`, error);

    return { error: "report-run-request-failed" };
  }

  return { error: null };
}

export async function listSchedulerReports(): Promise<SchedulerReportItem[]> {
  return db
    .select({
      active: reports.active,
      id: reports.id,
      nextRunAt: reports.nextRunAt,
    })
    .from(reports)
    .orderBy(desc(reports.createdAt))
    .all();
}

export async function updateReportNextRunAt(input: {
  id: string;
  nextRunAt: Date | null;
}) {
  const normalizedId = input.id.trim();

  if (!normalizedId) {
    return { error: "report-not-found" as const };
  }

  const existingReport = db
    .select({
      id: reports.id,
    })
    .from(reports)
    .where(eq(reports.id, normalizedId))
    .get();

  if (!existingReport) {
    return { error: "report-not-found" as const };
  }

  db.update(reports)
    .set({
      nextRunAt: input.nextRunAt,
      updatedAt: new Date(),
    })
    .where(eq(reports.id, existingReport.id))
    .run();

  return { error: null };
}
