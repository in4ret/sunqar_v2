"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Dropdown, Modal } from "@/ui";

import {
  getStoredReportModalAiModel,
  resolveStoredReportModalAiModel,
  setStoredReportModalAiModel,
  type ReportModalStorageConfig,
} from "./report-modal-storage";
import styles from "./report-modal.module.scss";

type ReportModalAiModel = {
  label: string;
  value: string;
};

type ReportModalSubmitPayload = {
  model: string;
  prompt: string;
};

type ReportModalProps = {
  aiModels: ReportModalAiModel[];
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: ReportModalSubmitPayload) => void | Promise<void>;
  storageConfig: ReportModalStorageConfig;
};

export function ReportModal({
  aiModels,
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
  storageConfig,
}: ReportModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <ReportModalContent
      aiModels={aiModels}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={onSubmit}
      storageConfig={storageConfig}
    />
  );
}

type ReportModalContentProps = {
  aiModels: ReportModalAiModel[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ReportModalSubmitPayload) => void | Promise<void>;
  storageConfig: ReportModalStorageConfig;
};

function ReportModalContent({
  aiModels,
  isSubmitting,
  onClose,
  onSubmit,
  storageConfig,
}: ReportModalContentProps) {
  const t = useTranslations();
  const [selectedAiModel, setSelectedAiModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const hasAiModels = aiModels.length > 0;
  const aiModelOptions = useMemo(
    () =>
      hasAiModels
        ? [{ label: t("report-modal.model-placeholder"), value: "" }, ...aiModels]
        : [{ label: t("report-modal.no-models"), value: "" }],
    [aiModels, hasAiModels, t],
  );

  useEffect(() => {
    const storedAiModel = getStoredReportModalAiModel(storageConfig);

    setSelectedAiModel(resolveStoredReportModalAiModel(storedAiModel, aiModels));
  }, [aiModels, storageConfig]);

  return (
    <Modal
      closeLabel={t("report-modal.close")}
      footer={
        <div className={styles["modal-footer-actions"]}>
          <button
            className={styles["submit-button"]}
            disabled={isSubmitting}
            type="button"
            onClick={() => {
              void onSubmit({
                model: selectedAiModel,
                prompt,
              });
            }}
          >
            {t("report-modal.submit")}
          </button>
        </div>
      }
      isOpen
      title={t("report-modal.title")}
      onClose={onClose}
    >
      <div className={styles["modal-content"]}>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("report-modal.model-label")}</span>
          <Dropdown
            aria-label={t("report-modal.model-label")}
            className={styles["field-dropdown"]}
            disabled={!hasAiModels}
            name="sunqar-report-modal-ai-model"
            options={aiModelOptions}
            value={selectedAiModel}
            onChange={(nextValue) => {
              setStoredReportModalAiModel(storageConfig, nextValue);
              setSelectedAiModel(nextValue);
            }}
          />
        </label>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("report-modal.prompt-label")}</span>
          <textarea
            className={styles["field-textarea"]}
            name="sunqar-report-modal-prompt"
            rows={8}
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
            }}
          />
        </label>
      </div>
    </Modal>
  );
}
