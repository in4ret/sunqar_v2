import { count } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { posts, sources } from "@/lib/db/schema";

export type DirectoriesSummary = {
  postsCount: number;
  sourcesCount: number;
};

export async function getDirectoriesSummary(): Promise<DirectoriesSummary> {
  const [sourcesSummary, postsSummary] = await Promise.all([
    db.select({ count: count() }).from(sources).get(),
    db.select({ count: count() }).from(posts).get(),
  ]);

  return {
    postsCount: postsSummary?.count ?? 0,
    sourcesCount: sourcesSummary?.count ?? 0,
  };
}
