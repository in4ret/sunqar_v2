import "server-only";

import crypto from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { sources as sourcesTable } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { formatLogMessage } from "@/lib/logs";
import { syncPosts } from "@/lib/posts/posts";

export { formatLogMessage } from "@/lib/logs";

type GlobalMaintenanceState = {
  isMaintenanceSchedulerStarted?: boolean;
  lastRunDate?: string;
  isMaintenanceInProgress?: boolean;
};

const globalMaintenanceState = globalThis as typeof globalThis & GlobalMaintenanceState;

export type DirectoriesUpdateStartStatus = "already-running" | "started";

export type SourceRow = {
  name: string;
  type: string;
  country: string;
};

type StoredSourceRow = {
  id: string;
  name: string;
  type: string | null;
  country: string | null;
};

type SourceSyncDiff = {
  toDelete: StoredSourceRow[];
  toInsert: SourceRow[];
  toUpdate: Array<{
    id: string;
    name: string;
    type: string;
    country: string;
  }>;
};

function buildSourceRowKey(input: {
  country: string | null;
  name: string;
  type: string | null;
}) {
  return `${input.name}\u0000${input.type ?? ""}\u0000${input.country ?? ""}`;
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let isInsideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];

    if (character === "\"") {
      const nextCharacter = csvText[index + 1];

      if (isInsideQuotes && nextCharacter === "\"") {
        currentValue += "\"";
        index += 1;
        continue;
      }

      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (!isInsideQuotes && character === ",") {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (!isInsideQuotes && (character === "\n" || character === "\r")) {
      if (character === "\r" && csvText[index + 1] === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (currentValue || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

function isRowEmpty(values: string[]) {
  return values.every((value) => value.trim() === "");
}

function findRequiredColumnIndex(headerRow: string[], columnName: string, sheetName: string) {
  const columnIndex = headerRow.findIndex((value) => value.trim() === columnName);

  if (columnIndex === -1) {
    throw new Error(`Google Sheet ${sheetName} is missing required column ${columnName}.`);
  }

  return columnIndex;
}

function getRequiredTrimmedValue(
  row: string[],
  columnIndex: number,
  columnName: string,
  sheetName: string,
  rowNumber: number,
) {
  const value = (row[columnIndex] ?? "").trim();

  if (!value) {
    throw new Error(`Google Sheet ${sheetName} row ${rowNumber} is missing required value ${columnName}.`);
  }

  return value;
}

export function buildSourcesGoogleSheetCsvUrl(sheetUrl: string, tabName: string) {
  const url = new URL(sheetUrl);
  const matches = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);

  if (!matches?.[1]) {
    throw new Error("SOURCES_GOOGLE_SHEET_URL must point to a Google Sheets document.");
  }

  return new URL(
    `/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`,
    `${url.protocol}//${url.host}`,
  ).toString();
}

export function parseTelegramSourceRowsCsv(csvText: string) {
  const rows = parseCsvRows(csvText).filter((row) => !isRowEmpty(row));

  if (rows.length === 0) {
    return [] as SourceRow[];
  }

  const [headerRow, ...dataRows] = rows;
  const channelNameIndex = findRequiredColumnIndex(headerRow, "channel_name", "tg");
  const countryIndex = findRequiredColumnIndex(headerRow, "country", "tg");

  return dataRows.map((row, index) => {
    const rowNumber = index + 2;

    return {
      country: getRequiredTrimmedValue(row, countryIndex, "country", "tg", rowNumber),
      name: getRequiredTrimmedValue(row, channelNameIndex, "channel_name", "tg", rowNumber),
      type: "telegram",
    };
  });
}

export function parseWebSourceRowsCsv(csvText: string) {
  const rows = parseCsvRows(csvText).filter((row) => !isRowEmpty(row));

  if (rows.length === 0) {
    return [] as SourceRow[];
  }

  const [headerRow, ...dataRows] = rows;
  const nameIndex = findRequiredColumnIndex(headerRow, "name", "params");
  const countryIndex = findRequiredColumnIndex(headerRow, "country", "params");
  const typeIndex = findRequiredColumnIndex(headerRow, "type", "params");

  return dataRows.map((row, index) => {
    const rowNumber = index + 2;

    return {
      country: getRequiredTrimmedValue(row, countryIndex, "country", "params", rowNumber),
      name: getRequiredTrimmedValue(row, nameIndex, "name", "params", rowNumber),
      type: getRequiredTrimmedValue(row, typeIndex, "type", "params", rowNumber),
    };
  });
}

async function loadTelegramSources(url: string) {
  const csvUrl = buildSourcesGoogleSheetCsvUrl(url, "tg");

  console.log(formatLogMessage(`Loading telegram sources from ${url}`));

  const response = await fetch(csvUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load telegram sources CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  const sourceRows = parseTelegramSourceRowsCsv(csvText);

  return sourceRows;
}

async function loadWebSources(url: string) {
  const csvUrl = buildSourcesGoogleSheetCsvUrl(url, "params");

  console.log(formatLogMessage(`Loading web sources from ${url}`));

  const response = await fetch(csvUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load web sources CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  const sourceRows = parseWebSourceRowsCsv(csvText);

  return sourceRows;
}

export function normalizeSourceRows(rows: SourceRow[]) {
  const sourceMap = new Map<string, SourceRow>();

  for (const row of rows) {
    sourceMap.set(buildSourceRowKey(row), row);
  }

  return [...sourceMap.values()];
}

export function diffSourcesForSync(sheetRows: SourceRow[], storedRows: StoredSourceRow[]): SourceSyncDiff {
  const normalizedSheetRows = normalizeSourceRows(sheetRows);
  const sheetMap = new Map(normalizedSheetRows.map((row) => [buildSourceRowKey(row), row]));
  const storedMap = new Map(storedRows.map((row) => [buildSourceRowKey(row), row]));

  const toInsert = normalizedSheetRows.filter((row) => !storedMap.has(buildSourceRowKey(row)));
  const toDelete = storedRows.filter((row) => !sheetMap.has(buildSourceRowKey(row)));
  const toUpdate = normalizedSheetRows.flatMap((row) => {
    const storedRow = storedMap.get(buildSourceRowKey(row));

    if (!storedRow) {
      return [];
    }

    const needsUpdate =
      storedRow.type !== row.type || storedRow.country !== row.country;

    if (!needsUpdate) {
      return [];
    }

    return [
      {
        country: row.country,
        id: storedRow.id,
        name: row.name,
        type: row.type,
      },
    ];
  });

  return {
    toDelete,
    toInsert,
    toUpdate,
  };
}

async function updateSources() {
  if (!env.sourcesGoogleSheetUrl) {
    throw new Error("SOURCES_GOOGLE_SHEET_URL is not configured.");
  }

  const telegramSources = await loadTelegramSources(env.sourcesGoogleSheetUrl);
  const webSources = await loadWebSources(env.sourcesGoogleSheetUrl);
  const loadedSources = [...telegramSources, ...webSources];
  const storedSources = db
    .select({
      country: sourcesTable.country,
      id: sourcesTable.id,
      name: sourcesTable.name,
      type: sourcesTable.type,
    })
    .from(sourcesTable)
    .all();
  const { toDelete, toInsert, toUpdate } = diffSourcesForSync(loadedSources, storedSources);

  db.transaction((transaction) => {
    const now = new Date();

    for (const source of toInsert) {
      transaction
        .insert(sourcesTable)
        .values({
          country: source.country,
          createdAt: now,
          id: crypto.randomUUID(),
          name: source.name,
          type: source.type,
          updatedAt: now,
        })
        .run();
    }

    for (const source of toUpdate) {
      transaction
        .update(sourcesTable)
        .set({
          country: source.country,
          type: source.type,
          updatedAt: now,
        })
        .where(eq(sourcesTable.id, source.id))
        .run();
    }

    for (const source of toDelete) {
      transaction.delete(sourcesTable).where(eq(sourcesTable.id, source.id)).run();
    }
  });

  console.log(
    formatLogMessage(
      `Sources sync finished: inserted ${toInsert.length}, updated ${toUpdate.length}, deleted ${toDelete.length}.`,
    ),
  );
}

export async function runDirectoriesUpdate(daily = true) {
  console.log(formatLogMessage(`${daily ? "Daily" : "Forced"} update started`));

  await updateSources();
  console.log(formatLogMessage("Posts sync started..."));
  await syncPosts();

  console.log(formatLogMessage(`${daily ? "Daily" : "Forced"} update finished`));
}

export function startDirectoriesUpdate(daily = true): DirectoriesUpdateStartStatus {
  if (globalMaintenanceState.isMaintenanceInProgress) {
    console.info(
      formatLogMessage(`${daily ? "Daily" : "Forced"} update skipped because it is already running.`),
    );

    return "already-running";
  }

  globalMaintenanceState.isMaintenanceInProgress = true;

  void runDirectoriesUpdate(daily)
    .catch((error) => {
      console.error(formatLogMessage(`${daily ? "Daily" : "Forced"} update failed`), error);
    })
    .finally(() => {
      globalMaintenanceState.isMaintenanceInProgress = false;
    });

  return "started";
}

export function startMaintenanceScheduler() {
  if (globalMaintenanceState.isMaintenanceSchedulerStarted) {
    console.log(formatLogMessage("ℹ️ Maintenance scheduler already started"));
    return;
  }

  console.info(formatLogMessage("✅ Maintenance scheduler started"));
  globalMaintenanceState.isMaintenanceSchedulerStarted = true;

  setInterval(async () => {
    const now = new Date();

    const today = now.toISOString().slice(0, 10);
    const isTwoAM = now.getHours() === 2;

    if (!isTwoAM) return;
    if (globalMaintenanceState.lastRunDate === today) return;

    globalMaintenanceState.lastRunDate = today;
    globalMaintenanceState.isMaintenanceInProgress = true;

    try {
      await runDirectoriesUpdate();
    } catch (error) {
      console.error(formatLogMessage("Daily update failed"), error);
    } finally {
      globalMaintenanceState.isMaintenanceInProgress = false;
    }
  }, 60_000);
}
