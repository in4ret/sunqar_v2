"use client";

import { type FormEvent, useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import type { Dispatch } from "react";

import {
  type AiModelFormState,
  submitCreateAiModel,
  submitDeleteAiModel,
  submitUpdateAiModel,
} from "@/app/(protected)/ai_models/actions";
import { translateActionMessage } from "@/lib/i18n/action-messages";
import { SaveIcon, TrashIcon, useToast } from "@/ui";

import styles from "./ai-model-manager.module.scss";

type AiModelManagerModel = {
  displayName: string;
  id: string;
  isActive: boolean;
  modelId: string;
  provider: string;
};

type AiModelManagerProps = {
  aiModels: AiModelManagerModel[];
};

const initialState: AiModelFormState = {
  aiModelId: null,
  error: null,
  success: null,
};

function AiModelCreateForm() {
  const [state, formAction, isPending] = useActionState(
    submitCreateAiModel,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();
  const t = useTranslations();
  const errorMessage = translateActionMessage(t, state.error);

  useEffect(() => {
    const successMessage = translateActionMessage(t, state.success);

    if (successMessage) {
      formRef.current?.reset();
      showToast({ message: successMessage, status: "success" });
    }
  }, [showToast, state.success, t]);

  return (
    <section className={styles["form-card"]}>
      <div className={styles["section-head"]}>
        <h2 className={styles["section-title"]}>{t("ai-models.form.title")}</h2>
        <p className={styles["section-copy"]}>
          {t("ai-models.form.description")}
        </p>
      </div>
      <form ref={formRef} className={styles["create-form"]} action={formAction}>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>
            {t("ai-models.form.provider")}
          </span>
          <input
            className={styles["field-input"]}
            name="provider"
            placeholder={t("ai-models.form.provider-placeholder")}
            required
            type="text"
          />
        </label>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>
            {t("ai-models.form.model-id")}
          </span>
          <input
            className={styles["field-input"]}
            name="modelId"
            placeholder={t("ai-models.form.model-id-placeholder")}
            required
            type="text"
          />
        </label>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>
            {t("ai-models.form.display-name")}
          </span>
          <input
            className={styles["field-input"]}
            name="displayName"
            placeholder={t("ai-models.form.display-name-placeholder")}
            required
            type="text"
          />
        </label>
        <label className={styles["checkbox-field"]}>
          <input
            className={styles["checkbox-input"]}
            defaultChecked
            name="isActive"
            type="checkbox"
          />
          <span>{t("ai-models.form.active")}</span>
        </label>
        {errorMessage ? <p className={styles["form-error"]}>{errorMessage}</p> : null}
        <button className={styles["submit-button"]} disabled={isPending} type="submit">
          {isPending ? t("ai-models.form.submitting") : t("ai-models.form.submit")}
        </button>
      </form>
    </section>
  );
}

type AiModelRowProps = {
  aiModel: AiModelManagerModel;
  deleteAction: Dispatch<FormData>;
  deleteState: AiModelFormState;
  isDeletePending: boolean;
};

function AiModelRow({
  aiModel,
  deleteAction,
  deleteState,
  isDeletePending,
}: AiModelRowProps) {
  const [updateState, updateAction, isUpdatePending] = useActionState(
    submitUpdateAiModel,
    initialState,
  );
  const { showToast } = useToast();
  const t = useTranslations();
  const deleteError =
    deleteState.aiModelId === aiModel.id
      ? translateActionMessage(t, deleteState.error)
      : null;
  const updateFormId = `ai-model-update-${aiModel.id}`;
  const updateError = translateActionMessage(t, updateState.error);

  useEffect(() => {
    const successMessage = translateActionMessage(t, updateState.success);

    if (successMessage) {
      showToast({ message: successMessage, status: "success" });
    }
  }, [showToast, t, updateState.success]);

  function handleDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        t("ai-models.delete-confirmation", { name: aiModel.displayName }),
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <tr>
      <td data-label={t("ai-models.table.provider")}>
        <form
          id={updateFormId}
          className={styles["row-form"]}
          action={updateAction}
        >
          <input name="id" type="hidden" value={aiModel.id} />
          <input
            aria-label={t("ai-models.table.provider")}
            className={styles["row-input"]}
            defaultValue={aiModel.provider}
            name="provider"
            required
            type="text"
          />
          {updateError ? (
            <p className={styles["row-error"]}>{updateError}</p>
          ) : null}
        </form>
      </td>
      <td data-label={t("ai-models.table.model-id")}>
        <input
          aria-label={t("ai-models.table.model-id")}
          className={styles["row-input"]}
          defaultValue={aiModel.modelId}
          form={updateFormId}
          name="modelId"
          required
          type="text"
        />
      </td>
      <td data-label={t("ai-models.table.display-name")}>
        <input
          aria-label={t("ai-models.table.display-name")}
          className={styles["row-input"]}
          defaultValue={aiModel.displayName}
          form={updateFormId}
          name="displayName"
          required
          type="text"
        />
      </td>
      <td
        className={styles["active-cell"]}
        data-label={t("ai-models.table.active")}
      >
        <label className={styles["row-checkbox-field"]}>
          <input
            aria-label={t("ai-models.table.active")}
            className={styles["checkbox-input"]}
            defaultChecked={aiModel.isActive}
            form={updateFormId}
            name="isActive"
            type="checkbox"
          />
          <span>{t("ai-models.table.active")}</span>
        </label>
      </td>
      <td className={styles["actions-cell"]} data-label={t("ai-models.table.actions")}>
        {deleteError ? (
          <p className={styles["row-error"]}>{deleteError}</p>
        ) : null}
        <div className={styles["actions-list"]}>
          <button
            aria-label={
              isUpdatePending
                ? t("ai-models.table.saving")
                : t("ai-models.table.save")
            }
            className={styles["save-button"]}
            disabled={isUpdatePending}
            form={updateFormId}
            type="submit"
          >
            <SaveIcon className={styles["button-icon"]} />
          </button>
          <form
            className={styles["delete-form"]}
            action={deleteAction}
            onSubmit={handleDeleteSubmit}
          >
            <input name="id" type="hidden" value={aiModel.id} />
            <button
              aria-label={
                isDeletePending
                  ? t("ai-models.table.deleting")
                  : t("ai-models.table.delete")
              }
              className={styles["delete-button"]}
              disabled={isDeletePending}
              type="submit"
            >
              <TrashIcon className={styles["button-icon"]} />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

export function AiModelManager({ aiModels }: AiModelManagerProps) {
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    submitDeleteAiModel,
    initialState,
  );
  const { showToast } = useToast();
  const t = useTranslations();

  useEffect(() => {
    const successMessage = translateActionMessage(t, deleteState.success);

    if (successMessage) {
      showToast({ message: successMessage, status: "success" });
    }
  }, [deleteState.success, showToast, t]);

  return (
    <div className={styles["content-grid"]}>
      <section className={styles["ai-model-list-card"]}>
        <div className={styles["section-head"]}>
          <h2 className={styles["section-title"]}>
            {t("ai-models.current-ai-models")}
          </h2>
          <p className={styles["section-copy"]}>
            {t("ai-models.ai-models-count", { count: aiModels.length })}
          </p>
        </div>
        {aiModels.length > 0 ? (
          <div className={styles["table-shell"]}>
            <table className={styles["ai-model-table"]}>
              <thead>
                <tr>
                  <th>{t("ai-models.table.provider")}</th>
                  <th>{t("ai-models.table.model-id")}</th>
                  <th>{t("ai-models.table.display-name")}</th>
                  <th>{t("ai-models.table.active")}</th>
                  <th>{t("ai-models.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {aiModels.map((aiModel) => (
                  <AiModelRow
                    aiModel={aiModel}
                    deleteAction={deleteAction}
                    deleteState={deleteState}
                    isDeletePending={isDeletePending}
                    key={aiModel.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles["empty-ai-models"]}>{t("ai-models.empty")}</p>
        )}
      </section>
      <AiModelCreateForm />
    </div>
  );
}
