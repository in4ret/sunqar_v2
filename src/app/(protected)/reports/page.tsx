import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/auth";
import styles from "./page.module.scss";

export default async function ReportsPage() {
  await requireRole("user");
  const t = await getTranslations();

  return (
    <section className={styles["reports-page"]}>
      <div className={styles["page-header"]}>
        <h1 className={styles["page-title"]}>{t("reports.title")}</h1>
        <Link className={styles["new-report-link"]} href="/reports/new">
          {t("reports.new-report")}
        </Link>
      </div>
    </section>
  );
}
