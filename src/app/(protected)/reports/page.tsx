import { requireRole } from "@/lib/auth/auth";
import { listReports } from "@/lib/reports";

import { ReportsPageView } from "./reports-page-view/reports-page-view";

export default async function ReportsPage() {
  const user = await requireRole(["admin", "user"]);
  const reportItems = await listReports(user.id);

  return <ReportsPageView reportItems={reportItems} />;
}
