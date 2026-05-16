"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { ReportActiveToggle, ReportRowActions } from "@/components/reports";
import { formatStoredReportPeriod } from "@/lib/reports";
import { routes } from "@/lib/routes";

import styles from "../page.module.scss";

type ReportListItemView = {
  active: boolean;
  authorName: string;
  description: string;
  id: string;
  period: string;
  title: string;
};

type ReportsPageViewProps = {
  reportItems: ReportListItemView[];
};

export function ReportsPageView({ reportItems }: ReportsPageViewProps) {
  const locale = useLocale();
  const t = useTranslations();
  const recurrenceT = useTranslations("recurrence-picker");
  const tableLabels = {
    actions: t("reports.table.actions"),
    author: t("reports.table.author"),
    description: t("reports.table.description"),
    period: t("reports.table.period"),
    status: t("reports.table.status"),
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
                  <th>{tableLabels.status}</th>
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
                    <td className={styles["active-cell"]} data-label={tableLabels.status}>
                      <ReportActiveToggle
                        active={report.active}
                        reportId={report.id}
                        reportTitle={report.title}
                      />
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
        <Link className={styles["new-report-link"]} href={routes.newReport}>
          {t("reports.new-report")}
        </Link>
      </div>
    </section>
  );
}
