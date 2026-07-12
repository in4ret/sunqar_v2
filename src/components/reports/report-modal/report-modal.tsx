"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Dropdown, Modal } from "@/ui";

import {
  getStoredReportModalAiModel,
  type ReportModalStorageConfig,
  resolveStoredReportModalAiModel,
  setStoredReportModalAiModel,
} from "./report-modal-storage";

import styles from "./report-modal.module.scss";

type ReportModalVariant = "comments" | "news";

type ReportModalAiModel = {
  label: string;
  value: string;
};

type ReportModalSubmitPayload = {
  additionalData?: string;
  model: string;
  opinionData?: string;
  prompt: string;
};

type ReportModalProps = {
  aiModels: ReportModalAiModel[];
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: ReportModalSubmitPayload) => void | Promise<void>;
  storageConfig: ReportModalStorageConfig;
  variant: ReportModalVariant;
};

export function ReportModal({
  aiModels,
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
  storageConfig,
  variant,
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
      variant={variant}
    />
  );
}

type ReportModalContentProps = {
  aiModels: ReportModalAiModel[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ReportModalSubmitPayload) => void | Promise<void>;
  storageConfig: ReportModalStorageConfig;
  variant: ReportModalVariant;
};
type NewsReportModalTab = "prompt" | "additional-data" | "opinion-data";

function ReportModalContent({
  aiModels,
  isSubmitting,
  onClose,
  onSubmit,
  storageConfig,
  variant,
}: ReportModalContentProps) {
  const t = useTranslations();
  const [selectedAiModel, setSelectedAiModel] = useState(() =>
    resolveStoredReportModalAiModel(getStoredReportModalAiModel(storageConfig), aiModels),
  );
  const [activeNewsTab, setActiveNewsTab] = useState<NewsReportModalTab>("prompt");
  const [additionalData, setAdditionalData] = useState("");
  const [opinionData, setOpinionData] = useState("");
  const [prompt, setPrompt] = useState("");
  const isNewsVariant = variant === "news";
  const hasAiModels = aiModels.length > 0;
  const aiModelOptions = useMemo(
    () =>
      hasAiModels
        ? [{ label: t("report-modal.model-placeholder"), value: "" }, ...aiModels]
        : [{ label: t("report-modal.no-models"), value: "" }],
    [aiModels, hasAiModels, t],
  );

  const newsTabs = useMemo(
    () => [
      {
        id: "prompt" as const,
        label: t("report-modal.prompt-tab"),
        name: "sunqar-report-modal-prompt",
        onChange: setPrompt,
        placeholder: t("report-modal.prompt-placeholder"),
        value: prompt,
      },
      {
        id: "additional-data" as const,
        label: t("report-modal.additional-data-tab"),
        name: "sunqar-report-modal-additional-data",
        onChange: setAdditionalData,
        placeholder: t("report-modal.additional-data-placeholder"),
        value: additionalData,
      },
      {
        id: "opinion-data" as const,
        label: t("report-modal.opinion-data-tab"),
        name: "sunqar-report-modal-opinion-data",
        onChange: setOpinionData,
        placeholder: t("report-modal.opinion-data-placeholder"),
        value: opinionData,
      },
    ],
    [additionalData, opinionData, prompt, t],
  );
  const activeNewsTabConfig = newsTabs.find((tab) => tab.id === activeNewsTab) ?? newsTabs[0];

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
                ...(isNewsVariant
                  ? {
                      additionalData,
                      opinionData,
                    }
                  : {}),
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
        {isNewsVariant ? (
          <div className={styles["field"]}>
            <div
              aria-label={t("report-modal.tabs-label")}
              className={styles["tab-list"]}
              role="tablist"
            >
              {newsTabs.map((tab) => {
                const tabPanelId = `report-modal-${tab.id}-panel`;
                const tabId = `report-modal-${tab.id}-tab`;
                const isSelected = activeNewsTabConfig.id === tab.id;

                return (
                  <button
                    aria-controls={tabPanelId}
                    aria-selected={isSelected}
                    className={styles["tab-button"]}
                    id={tabId}
                    key={tab.id}
                    role="tab"
                    type="button"
                    onClick={() => {
                      setActiveNewsTab(tab.id);
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <label
              aria-labelledby={`report-modal-${activeNewsTabConfig.id}-tab`}
              className={styles["tab-panel"]}
              id={`report-modal-${activeNewsTabConfig.id}-panel`}
              role="tabpanel"
            >
              <span className={styles["field-label"]}>{activeNewsTabConfig.label}</span>
              <textarea
                className={styles["field-textarea"]}
                name={activeNewsTabConfig.name}
                placeholder={activeNewsTabConfig.placeholder}
                rows={8}
                value={activeNewsTabConfig.value}
                onChange={(event) => {
                  activeNewsTabConfig.onChange(event.target.value);
                }}
              />
            </label>
          </div>
        ) : (
          <label className={styles["field"]}>
            <span className={styles["field-label"]}>{t("report-modal.prompt-label")}</span>
            <textarea
              className={styles["field-textarea"]}
              name="sunqar-report-modal-prompt"
              placeholder={t("report-modal.prompt-placeholder")}
              rows={8}
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
              }}
            />
          </label>
        )}
      </div>
    </Modal>
  );
}
