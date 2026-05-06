import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ReportRowActions } from "@/components/reports";
import { requireRole } from "@/lib/auth/auth";
import { formatStoredReportPeriod, listReports } from "@/lib/reports";
import styles from "./page.module.scss";

export default async function ReportsPage() {
  await requireRole("user");
  const locale = await getLocale();
  const t = await getTranslations();
  const recurrenceT = await getTranslations("recurrence-picker");
  const reportItems = await listReports();
  const tableLabels = {
    active: t("reports.table.active"),
    actions: t("reports.table.actions"),
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
                  <th className={styles["actions-heading"]}>{tableLabels.actions}</th>
                </tr>
              </thead>
              <tbody>
                {reportItems.map((report) => (
                  <tr key={report.id}>
                    <td data-label={tableLabels.title}>{report.title}</td>
                    <td data-label={tableLabels.description}>{report.description}</td>
                    <td data-label={tableLabels.period}>
                      {formatStoredReportPeriod({
                        locale,
                        period: report.period,
                        t: (key, values) => recurrenceT(key, values),
                      })}
                    </td>
                    <td data-label={tableLabels.author}>{report.authorName}</td>
                    <td data-label={tableLabels.active}>
                      {report.active
                        ? t("common.statuses.active")
                        : t("common.statuses.inactive")}
                    </td>
                    <td className={styles["actions-cell"]} data-label={tableLabels.actions}>
                      <ReportRowActions reportId={report.id} reportTitle={report.title} />
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
