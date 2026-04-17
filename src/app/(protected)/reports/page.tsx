import { getTranslations } from "next-intl/server";

export default async function ReportsPage() {
  const t = await getTranslations();

  return <h1>{t("reports.title")}</h1>;
}
