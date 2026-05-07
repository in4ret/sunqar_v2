"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  submitCreateReport,
  submitUpdateReport,
  type ReportMutationState,
} from "@/app/(protected)/reports/actions";
import { Dropdown, MultiSelect, RecurrencePicker, type RecurrenceValue } from "@/ui";
import styles from "./create-report-form.module.scss";

const initialState: ReportMutationState = {
  error: null,
  reportId: null,
  success: null,
};

type CreateReportFormAiModel = {
  label: string;
  value: string;
};

type CreateReportFormSourceOption = {
  label: string;
  value: string;
};

type ReportBlockFormValue = {
  aiModel: string;
  keywords: string;
  prompt: string;
  sources: string[];
  title: string;
};

type ReportBlockDraft = ReportBlockFormValue & {
  clientId: string;
};

type CreateReportFormProps = {
  aiModels: CreateReportFormAiModel[];
  sourceOptions: CreateReportFormSourceOption[];
  initialValues?: {
    blocks: ReportBlockFormValue[];
    description: string;
    id: string;
    period: RecurrenceValue;
    title: string;
  };
  mode?: "create" | "edit";
};

const emptyBlock: ReportBlockFormValue = {
  aiModel: "",
  keywords: "",
  prompt: "",
  sources: [],
  title: "",
};

const defaultRecurrenceValue: RecurrenceValue = {
  frequency: "daily",
  interval: 1,
  times: [],
};

function DeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles["delete-icon"]}
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

function createBlockDraft(block?: Partial<ReportBlockFormValue>): ReportBlockDraft {
  return {
    ...emptyBlock,
    ...block,
    clientId: crypto.randomUUID(),
  };
}

export function CreateReportForm({
  aiModels,
  sourceOptions,
  initialValues,
  mode = "create",
}: CreateReportFormProps) {
  const action = mode === "edit" ? submitUpdateReport : submitCreateReport;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [blocks, setBlocks] = useState<ReportBlockDraft[]>(() =>
    initialValues?.blocks.map((block) => createBlockDraft(block)) ?? [createBlockDraft()],
  );
  const [period, setPeriod] = useState<RecurrenceValue>(
    initialValues?.period ?? defaultRecurrenceValue,
  );
  const router = useRouter();
  const t = useTranslations();
  const titleValue = initialValues?.title ?? "";
  const descriptionValue = initialValues?.description ?? "";
  const hasAiModels = aiModels.length > 0;
  const aiModelOptions = hasAiModels
    ? [
        { label: t("reports.form.block-ai-model-placeholder"), value: "" },
        ...aiModels,
      ]
    : [{ label: t("reports.form.no-ai-models"), value: "" }];

  function updateBlock(
    index: number,
    field: keyof ReportBlockFormValue,
    value: string | string[],
  ) {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block, blockIndex) =>
        blockIndex === index ? { ...block, [field]: value } : block,
      ),
    );
  }

  function addBlock() {
    setBlocks((currentBlocks) => [...currentBlocks, createBlockDraft()]);
  }

  function removeBlock(index: number) {
    setBlocks((currentBlocks) => currentBlocks.filter((_, blockIndex) => blockIndex !== index));
  }

  useEffect(() => {
    if (state.success) {
      router.push("/reports");
    }
  }, [router, state.success]);

  return (
    <section className={styles["form-card"]}>
      <div className={styles["section-head"]}>
        <h2 className={styles["section-title"]}>
          {mode === "edit" ? t("reports.edit.title") : t("reports.form.title")}
        </h2>
        <p className={styles["section-copy"]}>
          {mode === "edit" ? t("reports.edit.description") : t("reports.form.description")}
        </p>
      </div>
      <form className={styles["create-form"]} action={formAction}>
        {mode === "edit" ? (
          <input name="reportId" type="hidden" value={initialValues?.id ?? ""} />
        ) : null}
        <div className={styles["top-fields"]}>
          <label className={styles["field"]}>
            <span className={styles["field-label"]}>{t("reports.form.report-title")}</span>
            <input
              className={styles["field-input"]}
              defaultValue={titleValue}
              name="title"
              required
              type="text"
            />
          </label>
          <div className={styles["period-field"]}>
            <input name="period" type="hidden" value={JSON.stringify(period)} />
            <span className={styles["field-label"]}>{t("reports.form.report-period")}</span>
            <RecurrencePicker
              disabled={isPending}
              value={period}
              onChange={(nextValue) => {
                setPeriod(nextValue);
              }}
            />
          </div>
        </div>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("reports.form.report-description")}</span>
          <textarea
            className={styles["field-textarea"]}
            defaultValue={descriptionValue}
            name="description"
            required
            rows={2}
          />
        </label>
        <div className={styles["blocks-section"]}>
          <div className={styles["blocks-list"]}>
            {blocks.map((block, index) => (
              <section key={block.clientId} className={styles["block-card"]}>
                <div className={styles["block-content"]}>
                  <div className={styles["block-top-fields"]}>
                    <label className={styles["field"]}>
                      <span className={styles["field-label"]}>{t("reports.form.block-title")}</span>
                      <input
                        className={styles["field-input"]}
                        name={`blocks[${index}].title`}
                        onChange={(event) => updateBlock(index, "title", event.currentTarget.value)}
                        required
                        type="text"
                        value={block.title}
                      />
                    </label>
                    <label className={styles["field"]}>
                      <span className={styles["field-label"]}>
                        {t("reports.form.block-ai-model")}
                      </span>
                      <Dropdown
                        aria-label={t("reports.form.block-ai-model")}
                        className={styles["field-dropdown"]}
                        disabled={!hasAiModels}
                        name={`blocks[${index}].aiModel`}
                        onChange={(value) => updateBlock(index, "aiModel", value)}
                        options={aiModelOptions}
                        value={block.aiModel}
                      />
                    </label>
                  </div>
                  {!hasAiModels ? (
                    <p className={styles["field-hint"]}>{t("reports.form.no-ai-models-hint")}</p>
                  ) : null}
                  <label className={styles["field"]}>
                    <span className={styles["field-label"]}>{t("reports.form.block-prompt")}</span>
                    <textarea
                      className={styles["field-textarea"]}
                      name={`blocks[${index}].prompt`}
                      onChange={(event) => updateBlock(index, "prompt", event.currentTarget.value)}
                      required
                      rows={2}
                      value={block.prompt}
                    />
                  </label>
                  <div className={styles["block-bottom-fields"]}>
                    <div className={styles["field"]}>
                      <span className={styles["field-label"]}>
                        {t("reports.form.block-sources")}
                      </span>
                      <MultiSelect
                        aria-label={t("reports.form.block-sources")}
                        disabled={isPending}
                        emptyLabel={t("reports.form.block-sources-empty")}
                        name={`blocks[${index}].sources`}
                        onChange={(value) => updateBlock(index, "sources", value)}
                        options={sourceOptions}
                        placeholder={t("reports.form.block-sources-placeholder")}
                        removeButtonLabel={(label) =>
                          t("reports.form.remove-selected-source", { source: label })
                        }
                        value={block.sources}
                      />
                    </div>
                    <label className={styles["field"]}>
                      <span className={styles["field-label"]}>
                        {t("reports.form.block-keywords")}
                      </span>
                      <input
                        className={styles["field-input"]}
                        name={`blocks[${index}].keywords`}
                        onChange={(event) => updateBlock(index, "keywords", event.currentTarget.value)}
                        placeholder={t("reports.form.block-keywords-placeholder")}
                        type="text"
                        value={block.keywords}
                      />
                    </label>
                  </div>
                </div>
                <div className={styles["remove-column"]}>
                  <button
                    aria-label={t("reports.form.remove-block")}
                    className={styles["remove-block-button"]}
                    disabled={isPending || index === 0}
                    onClick={index > 0 ? () => removeBlock(index) : undefined}
                    type="button"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </section>
            ))}
          </div>
          <button
            className={styles["add-block-button"]}
            disabled={isPending}
            onClick={addBlock}
            type="button"
          >
            {t("reports.form.add-block")}
          </button>
        </div>
        {state.error ? <p className={styles["form-error"]}>{state.error}</p> : null}
        <div className={styles["actions"]}>
          <button
            className={styles["submit-button"]}
            disabled={isPending}
            type="submit"
          >
            {isPending
              ? mode === "edit"
                ? t("reports.form.updating")
                : t("reports.form.submitting")
              : mode === "edit"
                ? t("reports.form.update")
                : t("reports.form.submit")}
          </button>
          <button
            className={styles["cancel-button"]}
            disabled={isPending}
            onClick={() => router.push("/reports")}
            type="button"
          >
            {t("reports.form.cancel")}
          </button>
        </div>
      </form>
    </section>
  );
}
