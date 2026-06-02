"use client";

import {
  type ForwardedRef,
  forwardRef,
  useActionState,
  useEffect,
  useId,
  useImperativeHandle,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import {
  type SourceFormState,
  submitCreateSource,
  submitUpdateSource,
} from "@/app/(protected)/sources/actions";
import { translateActionMessage } from "@/lib/i18n/action-messages";
import { Combobox, Modal, useToast } from "@/ui";

import type {
  SourceManagerOption,
  SourceManagerSource,
} from "../source-manager/source-manager.types";

import styles from "./edit-source-modal.module.scss";

const initialState: SourceFormState = {
  error: null,
  sourceId: null,
  success: null,
};

export type EditSourceModalHandle = {
  openCreate: () => void;
  openEdit: (source: SourceManagerSource) => void;
};

type EditSourceModalProps = {
  countryOptions: SourceManagerOption[];
  typeOptions: SourceManagerOption[];
};

type SourceModalState =
  | { mode: "create"; requestId: number }
  | { mode: "edit"; requestId: number; source: SourceManagerSource };

type SourceModalFormProps = EditSourceModalProps & {
  modalState: SourceModalState;
  onSuccess: (message: string) => void;
};

function SourceModalForm({
  countryOptions,
  modalState,
  onSuccess,
  typeOptions,
}: SourceModalFormProps) {
  const [createState, createAction, isCreatePending] = useActionState(
    submitCreateSource,
    initialState,
  );
  const [updateState, updateAction, isUpdatePending] = useActionState(
    submitUpdateSource,
    initialState,
  );
  const formId = useId();
  const t = useTranslations();
  const selectedSource = modalState.mode === "edit" ? modalState.source : null;
  const isCreateMode = modalState.mode === "create";
  const activeState = isCreateMode ? createState : updateState;
  const formAction = isCreateMode ? createAction : updateAction;
  const isPending = isCreateMode ? isCreatePending : isUpdatePending;
  const errorMessage = translateActionMessage(
    t,
    isCreateMode
      ? createState.error
      : updateState.sourceId === selectedSource?.id
        ? updateState.error
        : null,
  );

  useEffect(() => {
    const successMessage = translateActionMessage(t, activeState.success);

    if (!successMessage) {
      return;
    }

    if (!isCreateMode && updateState.sourceId !== selectedSource?.id) {
      return;
    }

    onSuccess(successMessage);
  }, [
    activeState.success,
    isCreateMode,
    onSuccess,
    selectedSource?.id,
    t,
    updateState.sourceId,
  ]);

  return (
    <div className={styles["modal-content"]}>
      <form id={formId} className={styles["edit-form"]} action={formAction}>
        {selectedSource ? (
          <input name="sunqar-source-id" type="hidden" value={selectedSource.id} />
        ) : null}
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("sources.form.name")}</span>
          <input
            className={styles["field-input"]}
            defaultValue={selectedSource?.name ?? ""}
            name="sunqar-source-name"
            required
            type="text"
          />
        </label>
        <div className={styles["field"]}>
          <span className={styles["field-label"]}>{t("sources.form.type")}</span>
          <Combobox
            aria-label={t("sources.form.type")}
            defaultValue={selectedSource?.type ?? ""}
            key={`${modalState.requestId}-type`}
            name="sunqar-source-type"
            options={typeOptions}
            placeholder={t("sources.form.type-placeholder")}
          />
        </div>
        <div className={styles["field"]}>
          <span className={styles["field-label"]}>{t("sources.form.country")}</span>
          <Combobox
            aria-label={t("sources.form.country")}
            defaultValue={selectedSource?.country ?? ""}
            key={`${modalState.requestId}-country`}
            name="sunqar-source-country"
            options={countryOptions}
            placeholder={t("sources.form.country-placeholder")}
          />
        </div>
        {errorMessage ? <p className={styles["form-error"]}>{errorMessage}</p> : null}
        <div className={styles["modal-footer-actions"]}>
          <button
            className={styles["submit-button"]}
            disabled={isPending}
            form={formId}
            type="submit"
          >
            {isPending ? t("sources.table.saving") : t("sources.table.save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditSourceModalComponent(
  { countryOptions, typeOptions }: EditSourceModalProps,
  ref: ForwardedRef<EditSourceModalHandle>,
) {
  const [modalState, setModalState] = useState<SourceModalState | null>(null);
  const { showToast } = useToast();
  const t = useTranslations();

  useImperativeHandle(
    ref,
    () => ({
      openCreate() {
        setModalState((currentState) => ({
          mode: "create",
          requestId: (currentState?.requestId ?? 0) + 1,
        }));
      },
      openEdit(source) {
        setModalState((currentState) => ({
          mode: "edit",
          requestId: (currentState?.requestId ?? 0) + 1,
          source,
        }));
      },
    }),
    [],
  );

  function handleClose() {
    setModalState(null);
  }

  function handleSuccess(message: string) {
    showToast({ message, status: "success" });
    window.setTimeout(() => {
      setModalState(null);
    }, 0);
  }

  return (
    <Modal
      closeLabel={t("sources.modal.close")}
      isOpen={modalState !== null}
      title={
        modalState?.mode === "create"
          ? t("sources.modal.create-title")
          : t("sources.modal.edit-title")
      }
      onClose={handleClose}
    >
      {modalState ? (
        <SourceModalForm
          key={modalState.requestId}
          countryOptions={countryOptions}
          modalState={modalState}
          onSuccess={handleSuccess}
          typeOptions={typeOptions}
        />
      ) : null}
    </Modal>
  );
}

export const EditSourceModal = forwardRef<EditSourceModalHandle, EditSourceModalProps>(
  EditSourceModalComponent,
);
