import crypto from "node:crypto";

import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { sources } from "@/lib/db/schema";

export type SourceMutationErrorCode =
  | "source-fields-required"
  | "source-name-exists"
  | "source-not-found";

export async function listSources() {
  return db.select().from(sources).orderBy(asc(sources.name)).all();
}

function normalizeOptionalSourceField(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue : null;
}

function getSourceNames(value: string) {
  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function hasDuplicateSourceName(names: string[]) {
  return new Set(names).size !== names.length;
}

export async function createSourcesByAdmin(input: {
  names: string;
  type: string;
  country: string;
}) {
  const names = getSourceNames(input.names);
  const type = normalizeOptionalSourceField(input.type);
  const country = normalizeOptionalSourceField(input.country);

  if (names.length === 0) {
    return { error: "source-fields-required" as SourceMutationErrorCode };
  }

  if (hasDuplicateSourceName(names)) {
    return { error: "source-name-exists" as SourceMutationErrorCode };
  }

  const existingSource = db
    .select()
    .from(sources)
    .where(inArray(sources.name, names))
    .get();

  if (existingSource) {
    return { error: "source-name-exists" as SourceMutationErrorCode };
  }

  const now = new Date();

  db.insert(sources)
    .values(
      names.map((name) => ({
        country,
        createdAt: now,
        id: crypto.randomUUID(),
        name,
        type,
        updatedAt: now,
      })),
    )
    .run();

  return { error: null, sourceNames: names };
}

export async function createSourceByAdmin(input: {
  name: string;
  type: string;
  country: string;
}) {
  const result = await createSourcesByAdmin({
    country: input.country,
    names: input.name,
    type: input.type,
  });

  if (result.error) {
    return result;
  }

  return { error: null, sourceName: result.sourceNames[0] };
}

export async function updateSourceByAdmin(input: {
  id: string;
  name: string;
  type: string;
  country: string;
}) {
  const id = input.id.trim();
  const name = input.name.trim();
  const type = normalizeOptionalSourceField(input.type);
  const country = normalizeOptionalSourceField(input.country);

  if (!id || !name) {
    return { error: "source-fields-required" as SourceMutationErrorCode };
  }

  const source = db.select().from(sources).where(eq(sources.id, id)).get();

  if (!source) {
    return { error: "source-not-found" as SourceMutationErrorCode };
  }

  const existingSource = db
    .select()
    .from(sources)
    .where(eq(sources.name, name))
    .get();

  if (existingSource && existingSource.id !== id) {
    return { error: "source-name-exists" as SourceMutationErrorCode };
  }

  db.update(sources)
    .set({
      country,
      name,
      type,
      updatedAt: new Date(),
    })
    .where(eq(sources.id, id))
    .run();

  return { error: null, sourceName: name };
}

export async function deleteSourceByAdmin(idValue: string) {
  const id = idValue.trim();

  if (!id) {
    return { error: "source-not-found" as SourceMutationErrorCode };
  }

  const source = db.select().from(sources).where(eq(sources.id, id)).get();

  if (!source) {
    return { error: "source-not-found" as SourceMutationErrorCode };
  }

  db.delete(sources).where(eq(sources.id, id)).run();

  return { error: null, sourceName: source.name };
}
