import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/auth";
import { listReports } from "@/lib/reports";
import styles from "./page.module.scss";

export default async function ReportsPage() {
  await requireRole("user");
  const t = await getTranslations();
  const reportItems = await listReports();
  const tableLabels = {
    active: t("reports.table.active"),
    author: t("reports.table.author"),
    description: t("reports.table.description"),
    period: t("reports.table.period"),
    title: t("reports.table.title"),
  };

  return (
    <section className={styles["reports-page"]}>
      <div className={styles["report-list-card"]}>
        {reportItems.length > 0 ? (
          <div className={styles["table-shell"]}>
            <table className={styles["reports-table"]}>
              <thead>
                <tr>
                  <th>{tableLabels.title}</th>
                  <th>{tableLabels.description}</th>
                  <th>{tableLabels.period}</th>
                  <th>{tableLabels.author}</th>
                  <th>{tableLabels.active}</th>
                </tr>
              </thead>
              <tbody>
                {reportItems.map((report) => (
                  <tr key={report.id}>
                    <td data-label={tableLabels.title}>{report.title}</td>
                    <td data-label={tableLabels.description}>{report.description}</td>
                    <td data-label={tableLabels.period}>{report.period}</td>
                    <td data-label={tableLabels.author}>{report.authorName}</td>
                    <td data-label={tableLabels.active}>
                      {report.active
                        ? t("common.statuses.active")
                        : t("common.statuses.inactive")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles["empty-state"]}>{t("reports.empty")}</p>
        )}
      </div>
      <div className={styles["actions"]}>
        <Link className={styles["new-report-link"]} href="/reports/new">
          {t("reports.new-report")}
        </Link>
      </div>
    </section>
  );
}
