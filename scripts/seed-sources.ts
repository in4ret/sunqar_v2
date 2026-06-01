import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { db } from "../src/lib/db/database";
import { sources } from "../src/lib/db/schema";

const requiredHeaders = ["name", "country", "type"] as const;

function getCsvPath() {
  const csvPath = process.argv[2]?.trim();

  if (!csvPath) {
    console.error("Usage: npm run db:seed-sources -- <csv-file>");
    process.exit(1);
  }

  return path.resolve(csvPath);
}

function normalizeOptionalValue(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue : null;
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let currentValue = "";
  let currentRow: string[] = [];
  let isInsideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === "\"") {
      if (isInsideQuotes && nextCharacter === "\"") {
        currentValue += "\"";
        index += 1;
        continue;
      }

      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (character === "," && !isInsideQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !isInsideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
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

  if (isInsideQuotes) {
    throw new Error("CSV parsing failed: unterminated quoted field.");
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  if (rows.length > 0 && rows[rows.length - 1]?.every((value) => value.trim() === "")) {
    rows.pop();
  }

  return rows;
}

function getHeaderMap(headerRow: string[]) {
  const normalizedHeaders = headerRow.map((header) => header.trim());

  if (normalizedHeaders.length !== requiredHeaders.length) {
    throw new Error(
      `CSV header must contain exactly these columns: ${requiredHeaders.join(", ")}.`,
    );
  }

  const missingHeaders = requiredHeaders.filter((header) => !normalizedHeaders.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`CSV header is missing required columns: ${missingHeaders.join(", ")}.`);
  }

  return {
    country: normalizedHeaders.indexOf("country"),
    name: normalizedHeaders.indexOf("name"),
    type: normalizedHeaders.indexOf("type"),
  };
}

async function main() {
  const csvPath = getCsvPath();
  const csvContent = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(csvContent);

  if (rows.length === 0) {
    throw new Error(`CSV file "${csvPath}" is empty.`);
  }

  const headerMap = getHeaderMap(rows[0]);
  let processedRowsCount = 0;

  for (const [index, row] of rows.slice(1).entries()) {
    if (row.length !== requiredHeaders.length) {
      throw new Error(
        `CSV row ${index + 2} has ${row.length} columns; expected ${requiredHeaders.length}.`,
      );
    }

    const name = row[headerMap.name]?.trim();

    if (!name) {
      throw new Error(`CSV row ${index + 2} is missing required "name" value.`);
    }

    const now = new Date();

    db.insert(sources)
      .values({
        country: normalizeOptionalValue(row[headerMap.country] ?? ""),
        createdAt: now,
        id: crypto.randomUUID(),
        name,
        type: normalizeOptionalValue(row[headerMap.type] ?? ""),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [sources.name],
        set: {
          country: normalizeOptionalValue(row[headerMap.country] ?? ""),
          type: normalizeOptionalValue(row[headerMap.type] ?? ""),
          updatedAt: now,
        },
      })
      .run();

    processedRowsCount += 1;
  }

  console.log(`Seeded ${processedRowsCount} sources from "${csvPath}".`);
}

main().catch((error) => {
  console.error("Sources seed failed.");
  console.error(error);
  process.exit(1);
});
