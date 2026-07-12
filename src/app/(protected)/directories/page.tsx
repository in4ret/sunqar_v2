import { requireRole } from "@/lib/auth/auth";
import { getDirectoriesSummary } from "@/lib/directories/directories-summary";

import { DirectoriesPageView } from "./directories-page-view/directories-page-view";

export default async function DirectoriesPage() {
  await requireRole("admin");

  const summary = await getDirectoriesSummary();

  return <DirectoriesPageView postsCount={summary.postsCount} sourcesCount={summary.sourcesCount} />;
}
