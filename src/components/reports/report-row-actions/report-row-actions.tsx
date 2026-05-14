"use client";

import { type FormEvent, useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  type ReportDeleteState,
  submitDeleteReport,
} from "@/app/(protected)/reports/actions";
import { useToast } from "@/ui";

import styles from "./report-row-actions.module.scss";

const initialState: ReportDeleteState = {
  error: null,
  reportId: null,
  success: null,
};

type ReportRowActionsProps = {
  reportId: string;
  reportTitle: string;
};

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles["button-icon"]}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 20h4l10-10-4-4L4 16v4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m12 6 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="m14 4 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles["button-icon"]}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M10 11v6M14 11v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M6 7h12l-1 13H7L6 7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M9 7V4h6v3"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ReportRowActions({
  reportId,
  reportTitle,
}: ReportRowActionsProps) {
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    submitDeleteReport,
    initialState,
  );
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations();

  useEffect(() => {
    if (deleteState.success) {
      showToast({ message: deleteState.success, status: "success" });
      router.refresh();
    }
  }, [deleteState.success, router, showToast]);

  useEffect(() => {
    if (deleteState.error) {
      showToast({ message: deleteState.error, status: "error" });
    }
  }, [deleteState.error, showToast]);

  function handleDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(t("reports.delete-confirmation", { title: reportTitle }))) {
      event.preventDefault();
    }
  }

  return (
    <div className={styles["actions-list"]}>
      <Link
        aria-label={t("reports.table.edit")}
        className={styles["edit-link"]}
        href={`/reports/${reportId}/edit`}
      >
        <EditIcon />
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
          <DeleteIcon />
        </button>
      </form>
    </div>
  );
}
