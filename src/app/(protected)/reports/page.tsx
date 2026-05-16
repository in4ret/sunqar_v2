import { requireRole } from "@/lib/auth/auth";
import { listReports } from "@/lib/reports";

import { ReportsPageView } from "./reports-page-view/reports-page-view";

export default async function ReportsPage() {
  await requireRole(["admin", "user"]);
  const reportItems = await listReports();

  return <ReportsPageView reportItems={reportItems} />;
}
