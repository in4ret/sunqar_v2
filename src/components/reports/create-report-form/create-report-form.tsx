"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  submitCreateReport,
  type CreateReportFormState,
} from "@/app/(protected)/reports/actions";
import styles from "./create-report-form.module.scss";

const initialState: CreateReportFormState = {
  error: null,
  success: null,
};

export function CreateReportForm() {
  const [state, formAction, isPending] = useActionState(submitCreateReport, initialState);
  const [isActive, setIsActive] = useState(true);
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    if (state.success) {
      router.push("/reports");
    }
  }, [router, state.success]);

  return (
    <section className={styles["form-card"]}>
      <div className={styles["section-head"]}>
        <h2 className={styles["section-title"]}>{t("reports.form.title")}</h2>
        <p className={styles["section-copy"]}>{t("reports.form.description")}</p>
      </div>
      <form className={styles["create-form"]} action={formAction}>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("reports.form.report-title")}</span>
          <input
            className={styles["field-input"]}
            name="title"
            required
            type="text"
          />
        </label>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("reports.form.report-description")}</span>
          <textarea
            className={styles["field-textarea"]}
            name="description"
            required
            rows={5}
          />
        </label>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("reports.form.report-period")}</span>
          <input
            className={styles["field-input"]}
            name="period"
            required
            type="text"
          />
        </label>
        <label className={styles["switch-field"]}>
          <input
            checked={isActive}
            className={styles["switch-input"]}
            name="isActive"
            onChange={(event) => setIsActive(event.currentTarget.checked)}
            type="checkbox"
          />
          <span className={styles["switch-copy"]}>
            {isActive ? t("common.statuses.active") : t("common.statuses.inactive")}
          </span>
        </label>
        {state.error ? <p className={styles["form-error"]}>{state.error}</p> : null}
        <div className={styles["actions"]}>
          <button
            className={styles["submit-button"]}
            disabled={isPending}
            type="submit"
          >
            {isPending ? t("reports.form.submitting") : t("reports.form.submit")}
          </button>
          <button
            className={styles["cancel-button"]}
            disabled={isPending}
            onClick={() => router.push("/reports")}
            type="button"
          >
            {t("reports.form.cancel")}
          </button>
        </div>
      </form>
    </section>
  );
}
