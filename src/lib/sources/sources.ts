import { asc } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { sources } from "@/lib/db/schema";

export async function listSources() {
  return db.select().from(sources).orderBy(asc(sources.name)).all();
}
