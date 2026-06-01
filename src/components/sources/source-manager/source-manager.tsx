"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  useActionState,
  useEffect,
  useId,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import type { Dispatch } from "react";

import {
  type SourceFormState,
  submitDeleteSource,
  submitUpdateSource,
} from "@/app/(protected)/sources/actions";
import { translateActionMessage } from "@/lib/i18n/action-messages";
import { Combobox, Modal, useToast } from "@/ui";

import styles from "./source-manager.module.scss";

type SourceManagerOption = {
  label: string;
  value: string;
};

type SourceManagerSource = {
  country: string | null;
  id: string;
  name: string;
  type: string | null;
};

type SourceManagerProps = {
  countryOptions: SourceManagerOption[];
  sources: SourceManagerSource[];
  typeOptions: SourceManagerOption[];
};

const initialState: SourceFormState = {
  error: null,
  sourceId: null,
  success: null,
};

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

type SourceRowProps = {
  deleteAction: Dispatch<FormData>;
  deleteState: SourceFormState;
  isDeletePending: boolean;
  onEdit: (source: SourceManagerSource) => void;
  source: SourceManagerSource;
};

function SourceRow({
  deleteAction,
  deleteState,
  isDeletePending,
  onEdit,
  source,
}: SourceRowProps) {
  const t = useTranslations();
  const deleteError =
    deleteState.sourceId === source.id
      ? translateActionMessage(t, deleteState.error)
      : null;

  function handleDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(t("sources.delete-confirmation", { name: source.name }))) {
      event.preventDefault();
    }
  }

  function openEditModal() {
    onEdit(source);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEditModal();
    }
  }

  function stopEventPropagation(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <tr
      className={styles["source-row"]}
      role="button"
      tabIndex={0}
      onClick={openEditModal}
      onKeyDown={handleRowKeyDown}
    >
      <td data-label={t("sources.table.name")}>
        <span className={styles["cell-text"]}>{source.name}</span>
      </td>
      <td data-label={t("sources.table.type")}>
        <span className={styles["cell-text"]}>{source.type ?? ""}</span>
      </td>
      <td data-label={t("sources.table.country")}>
        <span className={styles["cell-text"]}>{source.country ?? ""}</span>
      </td>
      <td
        className={styles["actions-cell"]}
        data-label={t("sources.table.actions")}
        onClick={stopEventPropagation}
      >
        {deleteError ? (
          <p className={styles["row-error"]}>{deleteError}</p>
        ) : null}
        <div className={styles["actions-list"]}>
          <form
            className={styles["delete-form"]}
            action={deleteAction}
            onSubmit={handleDeleteSubmit}
          >
            <input name="sunqar-source-id" type="hidden" value={source.id} />
            <button
              aria-label={
                isDeletePending
                  ? t("sources.table.deleting")
                  : t("sources.table.delete")
              }
              className={styles["delete-button"]}
              disabled={isDeletePending}
              type="submit"
              onClick={stopEventPropagation}
            >
              <DeleteIcon />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

type EditSourceModalProps = {
  countryOptions: SourceManagerOption[];
  isOpen: boolean;
  onClose: () => void;
  source: SourceManagerSource | null;
  typeOptions: SourceManagerOption[];
};

function EditSourceModal({
  countryOptions,
  isOpen,
  onClose,
  source,
  typeOptions,
}: EditSourceModalProps) {
  const [updateState, updateAction, isUpdatePending] = useActionState(
    submitUpdateSource,
    initialState,
  );
  const formId = useId();
  const { showToast } = useToast();
  const t = useTranslations();
  const updateError =
    source && updateState.sourceId === source.id
      ? translateActionMessage(t, updateState.error)
      : null;

  useEffect(() => {
    if (!source || updateState.sourceId !== source.id) {
      return;
    }

    const successMessage = translateActionMessage(t, updateState.success);

    if (successMessage) {
      showToast({ message: successMessage, status: "success" });
      onClose();
    }
  }, [onClose, showToast, source, t, updateState.sourceId, updateState.success]);

  if (!source) {
    return null;
  }

  return (
    <Modal
      closeLabel={t("sources.modal.close")}
      footer={
        <div className={styles["modal-footer-actions"]}>
          <button
            className={styles["submit-button"]}
            disabled={isUpdatePending}
            form={formId}
            type="submit"
          >
            {isUpdatePending ? t("sources.table.saving") : t("sources.table.save")}
          </button>
        </div>
      }
      isOpen={isOpen}
      title={t("sources.modal.title")}
      onClose={onClose}
    >
      <div className={styles["modal-content"]}>
        <form
          id={formId}
          className={styles["edit-form"]}
          action={updateAction}
        >
          <input name="sunqar-source-id" type="hidden" value={source.id} />
          <label className={styles["field"]}>
            <span className={styles["field-label"]}>{t("sources.form.name")}</span>
            <input
              className={styles["field-input"]}
              defaultValue={source.name}
              name="sunqar-source-name"
              required
              type="text"
            />
          </label>
          <div className={styles["field"]}>
            <span className={styles["field-label"]}>{t("sources.form.type")}</span>
            <Combobox
              aria-label={t("sources.form.type")}
              defaultValue={source.type ?? ""}
              key={`${source.id}-type`}
              name="sunqar-source-type"
              options={typeOptions}
              placeholder={t("sources.form.type-placeholder")}
            />
          </div>
          <div className={styles["field"]}>
            <span className={styles["field-label"]}>{t("sources.form.country")}</span>
            <Combobox
              aria-label={t("sources.form.country")}
              defaultValue={source.country ?? ""}
              key={`${source.id}-country`}
              name="sunqar-source-country"
              options={countryOptions}
              placeholder={t("sources.form.country-placeholder")}
            />
          </div>
          {updateError ? (
            <p className={styles["form-error"]}>{updateError}</p>
          ) : null}
        </form>
      </div>
    </Modal>
  );
}

export function SourceManager({
  countryOptions,
  sources,
  typeOptions,
}: SourceManagerProps) {
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    submitDeleteSource,
    initialState,
  );
  const [selectedSource, setSelectedSource] = useState<SourceManagerSource | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { showToast } = useToast();
  const t = useTranslations();

  useEffect(() => {
    const successMessage = translateActionMessage(t, deleteState.success);

    if (successMessage) {
      showToast({ message: successMessage, status: "success" });
    }
  }, [deleteState.success, showToast, t]);

  function handleEditSource(source: SourceManagerSource) {
    setSelectedSource(source);
    setIsEditModalOpen(true);
  }

  function handleCloseEditModal() {
    setIsEditModalOpen(false);
    setSelectedSource(null);
  }

  return (
    <>
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
                <th>{t("sources.table.type")}</th>
                <th>{t("sources.table.country")}</th>
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
                  onEdit={handleEditSource}
                  source={source}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles["empty-sources"]}>{t("sources.empty")}</p>
      )}
      <EditSourceModal
        isOpen={isEditModalOpen}
        countryOptions={countryOptions}
        onClose={handleCloseEditModal}
        source={selectedSource}
        typeOptions={typeOptions}
      />
    </>
  );
}
