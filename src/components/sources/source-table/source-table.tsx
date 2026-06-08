"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  memo,
  type MouseEvent,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react";
import { useTranslations } from "next-intl";

import type { Dispatch } from "react";

import {
  type SourceFormState,
  submitDeleteSource,
} from "@/app/(protected)/sources/actions";
import { translateActionMessage } from "@/lib/i18n/action-messages";
import { TrashIcon, useToast } from "@/ui";

import type { SourceManagerSource } from "../source-manager/source-manager.types";

import styles from "./source-table.module.scss";

const initialState: SourceFormState = {
  error: null,
  sourceId: null,
  success: null,
};

type SourceRowProps = {
  confirmDelete: (sourceName: string) => boolean;
  deleteAction: Dispatch<FormData>;
  deleteActionLabelId: string;
  deleteErrorMessage: string | null;
  deletingActionLabelId: string;
  deleteState: SourceFormState;
  isDeletePending: boolean;
  onEdit: (source: SourceManagerSource) => void;
  source: SourceManagerSource;
};

function SourceRow({
  confirmDelete,
  deleteAction,
  deleteActionLabelId,
  deleteErrorMessage,
  deletingActionLabelId,
  deleteState,
  isDeletePending,
  onEdit,
  source,
}: SourceRowProps) {
  const deleteError =
    deleteState.sourceId === source.id
      ? deleteErrorMessage
      : null;
  const sourceNameId = `sunqar-source-name-${source.id}`;
  const actionLabelId =
    isDeletePending && deleteState.sourceId === source.id
      ? deletingActionLabelId
      : deleteActionLabelId;

  function handleDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    if (!confirmDelete(source.name)) {
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
      <td>
        <span className={styles["cell-text"]} id={sourceNameId}>
          {source.name}
        </span>
      </td>
      <td>
        <span className={styles["cell-text"]}>{source.type ?? ""}</span>
      </td>
      <td>
        <span className={styles["cell-text"]}>{source.country ?? ""}</span>
      </td>
      <td className={styles["actions-cell"]} onClick={stopEventPropagation}>
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
              aria-labelledby={`${sourceNameId} ${actionLabelId}`}
              className={styles["delete-button"]}
              disabled={isDeletePending}
              type="submit"
              onClick={stopEventPropagation}
            >
              <TrashIcon className={styles["button-icon"]} />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

const MemoizedSourceRow = memo(SourceRow);

type SourceTableBodyProps = {
  confirmDelete: (sourceName: string) => boolean;
  deleteAction: Dispatch<FormData>;
  deleteActionLabelId: string;
  deleteErrorMessage: string | null;
  deletingActionLabelId: string;
  deleteState: SourceFormState;
  isDeletePending: boolean;
  onEdit: (source: SourceManagerSource) => void;
  sources: SourceManagerSource[];
};

function SourceTableBody({
  confirmDelete,
  deleteAction,
  deleteActionLabelId,
  deleteErrorMessage,
  deletingActionLabelId,
  deleteState,
  isDeletePending,
  onEdit,
  sources,
}: SourceTableBodyProps) {
  return (
    <tbody>
      {sources.map((source) => (
        <MemoizedSourceRow
          key={source.id}
          confirmDelete={confirmDelete}
          deleteAction={deleteAction}
          deleteActionLabelId={deleteActionLabelId}
          deleteErrorMessage={deleteErrorMessage}
          deleteState={deleteState}
          deletingActionLabelId={deletingActionLabelId}
          isDeletePending={isDeletePending}
          onEdit={onEdit}
          source={source}
        />
      ))}
    </tbody>
  );
}

const MemoizedSourceTableBody = memo(SourceTableBody);

type SourceTableProps = {
  onEdit: (source: SourceManagerSource) => void;
  sources: SourceManagerSource[];
};

function SourceTableComponent({ onEdit, sources }: SourceTableProps) {
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    submitDeleteSource,
    initialState,
  );
  const { showToast } = useToast();
  const t = useTranslations();
  const deleteActionLabelId = useId();
  const deletingActionLabelId = useId();
  const translateRef = useRef(t);
  const deleteErrorMessage = translateActionMessage(t, deleteState.error);

  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  const confirmDelete = useCallback((sourceName: string) => {
    return window.confirm(
      translateRef.current("sources.delete-confirmation", { name: sourceName }),
    );
  }, []);

  useEffect(() => {
    const successMessage = translateActionMessage(t, deleteState.success);

    if (successMessage) {
      showToast({ message: successMessage, status: "success" });
    }
  }, [deleteState.success, showToast, t]);

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className={styles["table-shell"]}>
      <span className={styles["sr-only"]} id={deleteActionLabelId}>
        {t("sources.table.delete")}
      </span>
      <span className={styles["sr-only"]} id={deletingActionLabelId}>
        {t("sources.table.deleting")}
      </span>
      <table className={styles["source-table"]}>
        <thead>
          <tr>
            <th>{t("sources.table.name")}</th>
            <th>{t("sources.table.type")}</th>
            <th>{t("sources.table.country")}</th>
            <th>{t("sources.table.actions")}</th>
          </tr>
        </thead>
        <MemoizedSourceTableBody
          confirmDelete={confirmDelete}
          deleteAction={deleteAction}
          deleteActionLabelId={deleteActionLabelId}
          deleteErrorMessage={deleteErrorMessage}
          deleteState={deleteState}
          deletingActionLabelId={deletingActionLabelId}
          isDeletePending={isDeletePending}
          onEdit={onEdit}
          sources={sources}
        />
      </table>
    </div>
  );
}

export const SourceTable = memo(SourceTableComponent);
