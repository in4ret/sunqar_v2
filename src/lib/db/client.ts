import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "@/lib/env";
import * as schema from "./schema";

declare global {
  var __sunqarDatabase__: Database.Database | undefined;
}

function ensureDatabaseDirectory(databasePath: string) {
  const resolvedPath = path.resolve(databasePath);
  const directory = path.dirname(resolvedPath);

  fs.mkdirSync(directory, { recursive: true });

  return resolvedPath;
}

const filePath = ensureDatabaseDirectory(env.databasePath);
const sqlite =
  globalThis.__sunqarDatabase__ ?? new Database(filePath, { fileMustExist: false });

sqlite.pragma("journal_mode = WAL");

if (!globalThis.__sunqarDatabase__) {
  globalThis.__sunqarDatabase__ = sqlite;
}

export const db = drizzle(sqlite, { schema });
