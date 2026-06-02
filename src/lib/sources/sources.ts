import crypto from "node:crypto";

import { asc, eq } from "drizzle-orm";

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

export async function createSourceByAdmin(input: {
  name: string;
  type: string;
  country: string;
}) {
  const name = input.name.trim();
  const type = normalizeOptionalSourceField(input.type);
  const country = normalizeOptionalSourceField(input.country);

  if (!name) {
    return { error: "source-fields-required" as SourceMutationErrorCode };
  }

  const existingSource = db
    .select()
    .from(sources)
    .where(eq(sources.name, name))
    .get();

  if (existingSource) {
    return { error: "source-name-exists" as SourceMutationErrorCode };
  }

  db.insert(sources)
    .values({
      country,
      createdAt: new Date(),
      id: crypto.randomUUID(),
      name,
      type,
      updatedAt: new Date(),
    })
    .run();

  return { error: null, sourceName: name };
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
