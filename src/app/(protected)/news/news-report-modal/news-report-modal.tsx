"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Dropdown, Modal, useToast } from "@/ui";

import styles from "./news-report-modal.module.scss";

type NewsReportModalAiModel = {
  label: string;
  value: string;
};

type NewsReportModalProps = {
  aiModels: NewsReportModalAiModel[];
  ids: string[];
  keyWords: string;
};

export function NewsReportModal({ aiModels, ids, keyWords }: NewsReportModalProps) {
  const t = useTranslations();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAiModel, setSelectedAiModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const hasSelectedArticles = ids.length > 0;
  const hasAiModels = aiModels.length > 0;
  const aiModelOptions = useMemo(
    () =>
      hasAiModels
        ? [{ label: t("news.report-modal.model-placeholder"), value: "" }, ...aiModels]
        : [{ label: t("news.report-modal.no-models"), value: "" }],
    [aiModels, hasAiModels, t],
  );

  function handleClose() {
    setIsOpen(false);
  }

  async function handleSubmit() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/news/report", {
        body: JSON.stringify({
          ids,
          keyWords,
          model: selectedAiModel,
          prompt,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        let errorMessage = t("news.report-modal.submit-error");

        try {
          const responseData = (await response.json()) as { error?: string };

          if (typeof responseData.error === "string" && responseData.error.trim()) {
            errorMessage = responseData.error.trim();
          }
        } catch {
          errorMessage = t("news.report-modal.submit-error");
        }

        throw new Error(errorMessage);
      }

      handleClose();
    } catch (error) {
      console.error("Failed to submit news report request.", error);
      showToast({
        message: error instanceof Error ? error.message : t("news.report-modal.submit-error"),
        status: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className={styles["report-action-bar"]}>
        <button
          className={styles["report-open-button"]}
          disabled={!hasSelectedArticles}
          type="button"
          onClick={() => {
            setIsOpen(true);
          }}
        >
          {t("news.report-modal.open-button")}
        </button>
      </div>
      <Modal
        closeLabel={t("news.report-modal.close")}
        footer={
          <div className={styles["modal-footer-actions"]}>
            <button
              className={styles["submit-button"]}
              disabled={isSubmitting}
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
            >
              {t("news.report-modal.submit")}
            </button>
          </div>
        }
        isOpen={isOpen}
        title={t("news.report-modal.title")}
        onClose={handleClose}
      >
        <div className={styles["modal-content"]}>
          <label className={styles["field"]}>
            <span className={styles["field-label"]}>{t("news.report-modal.model-label")}</span>
            <Dropdown
              aria-label={t("news.report-modal.model-label")}
              className={styles["field-dropdown"]}
              disabled={!hasAiModels}
              name="sunqar-news-report-ai-model"
              options={aiModelOptions}
              value={selectedAiModel}
              onChange={(nextValue) => {
                setSelectedAiModel(nextValue);
              }}
            />
          </label>
          <label className={styles["field"]}>
            <span className={styles["field-label"]}>{t("news.report-modal.prompt-label")}</span>
            <textarea
              className={styles["field-textarea"]}
              name="sunqar-news-report-prompt"
              rows={8}
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
              }}
            />
          </label>
        </div>
      </Modal>
    </>
  );
}
