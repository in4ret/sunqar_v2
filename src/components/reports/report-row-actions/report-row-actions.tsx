"use client";

import { type FormEvent, useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  type ReportDeleteState,
  type ReportRunState,
  submitDeleteReport,
  submitRunReport,
} from "@/app/(protected)/reports/actions";
import { translateActionMessage } from "@/lib/i18n/action-messages";
import { getReportEditRoute } from "@/lib/routes";
import { PencilIcon, PlayIcon, TrashIcon, useToast } from "@/ui";

import styles from "./report-row-actions.module.scss";

const initialState: ReportDeleteState = {
  error: null,
  reportId: null,
  success: null,
};

const initialRunState: ReportRunState = {
  error: null,
  reportId: null,
  success: null,
};

type ReportRowActionsProps = {
  reportId: string;
  reportTitle: string;
};

export function ReportRowActions({
  reportId,
  reportTitle,
}: ReportRowActionsProps) {
  const [runState, runAction, isRunPending] = useActionState(
    submitRunReport,
    initialRunState,
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    submitDeleteReport,
    initialState,
  );
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations();

  useEffect(() => {
    const successMessage = translateActionMessage(t, runState.success);

    if (successMessage) {
      showToast({ message: successMessage, status: "success" });
    }
  }, [runState.success, showToast, t]);

  useEffect(() => {
    const errorMessage = translateActionMessage(t, runState.error);

    if (errorMessage) {
      showToast({ message: errorMessage, status: "error" });
    }
  }, [runState.error, showToast, t]);

  useEffect(() => {
    const successMessage = translateActionMessage(t, deleteState.success);

    if (successMessage) {
      showToast({ message: successMessage, status: "success" });
      router.refresh();
    }
  }, [deleteState.success, router, showToast, t]);

  useEffect(() => {
    const errorMessage = translateActionMessage(t, deleteState.error);

    if (errorMessage) {
      showToast({ message: errorMessage, status: "error" });
    }
  }, [deleteState.error, showToast, t]);

  function handleDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(t("reports.delete-confirmation", { title: reportTitle }))) {
      event.preventDefault();
    }
  }

  return (
    <div className={styles["actions-list"]}>
      <form className={styles["run-form"]} action={runAction}>
        <input name="id" type="hidden" value={reportId} />
        <button
          aria-label={
            isRunPending
              ? t("reports.table.running")
              : t("reports.table.run")
          }
          className={styles["run-button"]}
          disabled={isRunPending}
          type="submit"
        >
          <PlayIcon className={styles["button-icon"]} />
        </button>
      </form>
      <Link
        aria-label={t("reports.table.edit")}
        className={styles["edit-link"]}
        href={getReportEditRoute(reportId)}
      >
        <PencilIcon className={styles["button-icon"]} />
      </Link>
      <form
        className={styles["delete-form"]}
        action={deleteAction}
        onSubmit={handleDeleteSubmit}
      >
        <input name="id" type="hidden" value={reportId} />
        <button
          aria-label={
            isDeletePending
              ? t("reports.table.deleting")
              : t("reports.table.delete")
          }
          className={styles["delete-button"]}
          disabled={isDeletePending}
          type="submit"
        >
          <TrashIcon className={styles["button-icon"]} />
        </button>
      </form>
    </div>
  );
}
