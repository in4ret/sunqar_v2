"use client";

import { type FormEvent, useActionState, useEffect, useRef } from "react";
import type { Dispatch } from "react";
import { useTranslations } from "next-intl";
import {
  submitCreateSource,
  submitDeleteSource,
  submitUpdateSource,
  type SourceFormState,
} from "@/app/(protected)/sources/actions";
import { useToast } from "@/ui";
import styles from "./source-manager.module.scss";

type SourceManagerSource = {
  id: string;
  name: string;
};

type SourceManagerProps = {
  sources: SourceManagerSource[];
};

const initialState: SourceFormState = {
  error: null,
  sourceId: null,
  success: null,
};

function SaveIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles["button-icon"]}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="M5 4h11l3 3v13H5V4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M8 4v6h7V4"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M8 20v-6h8v6"
        stroke="currentColor"
        strokeLinejoin="round"
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

function SourceCreateForm() {
  const [state, formAction, isPending] = useActionState(
    submitCreateSource,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();
  const t = useTranslations();

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      showToast({ message: state.success, status: "success" });
    }
  }, [showToast, state]);

  return (
    <section className={styles["form-card"]}>
      <div className={styles["section-head"]}>
        <h2 className={styles["section-title"]}>{t("sources.form.title")}</h2>
        <p className={styles["section-copy"]}>{t("sources.form.description")}</p>
      </div>
      <form ref={formRef} className={styles["create-form"]} action={formAction}>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("sources.form.name")}</span>
          <input
            className={styles["field-input"]}
            name="name"
            placeholder={t("sources.form.placeholder")}
            required
            type="text"
          />
        </label>
        {state.error ? <p className={styles["form-error"]}>{state.error}</p> : null}
        <button className={styles["submit-button"]} disabled={isPending} type="submit">
          {isPending ? t("sources.form.submitting") : t("sources.form.submit")}
        </button>
      </form>
    </section>
  );
}

type SourceRowProps = {
  deleteAction: Dispatch<FormData>;
  deleteState: SourceFormState;
  isDeletePending: boolean;
  source: SourceManagerSource;
};

function SourceRow({
  deleteAction,
  deleteState,
  isDeletePending,
  source,
}: SourceRowProps) {
  const [updateState, updateAction, isUpdatePending] = useActionState(
    submitUpdateSource,
    initialState,
  );
  const { showToast } = useToast();
  const t = useTranslations();
  const deleteError = deleteState.sourceId === source.id ? deleteState.error : null;
  const updateFormId = `source-update-${source.id}`;

  useEffect(() => {
    if (updateState.success) {
      showToast({ message: updateState.success, status: "success" });
    }
  }, [showToast, updateState]);

  function handleDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(t("sources.delete-confirmation", { name: source.name }))) {
      event.preventDefault();
    }
  }

  return (
    <tr>
      <td data-label={t("sources.table.name")}>
        <form
          id={updateFormId}
          className={styles["row-form"]}
          action={updateAction}
        >
          <input name="id" type="hidden" value={source.id} />
          <input
            aria-label={t("sources.table.name")}
            className={styles["row-input"]}
            defaultValue={source.name}
            name="name"
            required
            type="text"
          />
          {updateState.error ? (
            <p className={styles["row-error"]}>{updateState.error}</p>
          ) : null}
        </form>
      </td>
      <td className={styles["actions-cell"]} data-label={t("sources.table.actions")}>
        {deleteError ? (
          <p className={styles["row-error"]}>{deleteError}</p>
        ) : null}
        <div className={styles["actions-list"]}>
          <button
            aria-label={
              isUpdatePending
                ? t("sources.table.saving")
                : t("sources.table.save")
            }
            className={styles["save-button"]}
            disabled={isUpdatePending}
            form={updateFormId}
            type="submit"
          >
            <SaveIcon />
          </button>
          <form
            className={styles["delete-form"]}
            action={deleteAction}
            onSubmit={handleDeleteSubmit}
          >
            <input name="id" type="hidden" value={source.id} />
            <button
              aria-label={
                isDeletePending
                  ? t("sources.table.deleting")
                  : t("sources.table.delete")
              }
              className={styles["delete-button"]}
              disabled={isDeletePending}
              type="submit"
            >
              <DeleteIcon />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

export function SourceManager({ sources }: SourceManagerProps) {
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    submitDeleteSource,
    initialState,
  );
  const { showToast } = useToast();
  const t = useTranslations();

  useEffect(() => {
    if (deleteState.success) {
      showToast({ message: deleteState.success, status: "success" });
    }
  }, [deleteState, showToast]);

  return (
    <div className={styles["content-grid"]}>
      <section className={styles["source-list-card"]}>
        <div className={styles["section-head"]}>
          <h2 className={styles["section-title"]}>{t("sources.current-sources")}</h2>
          <p className={styles["section-copy"]}>
            {t("sources.sources-count", { count: sources.length })}
          </p>
        </div>
        {sources.length > 0 ? (
          <div className={styles["table-shell"]}>
            <table className={styles["source-table"]}>
              <thead>
                <tr>
                  <th>{t("sources.table.name")}</th>
                  <th>{t("sources.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <SourceRow
                    key={source.id}
                    deleteAction={deleteAction}
                    deleteState={deleteState}
                    isDeletePending={isDeletePending}
                    source={source}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles["empty-sources"]}>{t("sources.empty")}</p>
        )}
      </section>
      <SourceCreateForm />
    </div>
  );
}
