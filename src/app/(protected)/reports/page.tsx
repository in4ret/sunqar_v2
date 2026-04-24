import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/auth";

export default async function ReportsPage() {
  await requireRole("user");
  const t = await getTranslations();

  return <h1>{t("reports.title")}</h1>;
}
