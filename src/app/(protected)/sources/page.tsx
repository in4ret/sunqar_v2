import { requireRole } from "@/lib/auth/auth";
import { listSources } from "@/lib/sources/sources";

import { SourcesPageView } from "./sources-page-view/sources-page-view";

export default async function SourcesPage() {
  await requireRole("admin");

  const allSources = await listSources();

  return <SourcesPageView allSources={allSources.map(({ id, name }) => ({ id, name }))} />;
}
