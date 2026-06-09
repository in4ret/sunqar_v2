"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  type ReportMutationState,
  submitCreateReport,
  submitUpdateReport,
} from "@/app/(protected)/reports/actions";
import { translateActionMessage } from "@/lib/i18n/action-messages";
import { useNavigationHistory } from "@/lib/providers";
import { routes } from "@/lib/routes";
import {
  Dropdown,
  MultiSelect,
  type MultiSelectOption,
  RecurrencePicker,
  type RecurrenceValue,
  TrashIcon,
} from "@/ui";

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

type CreateReportFormSource = {
  country: string | null;
  name: string;
  type: string | null;
};

type ReportBlockFormValue = {
  aiModel: string;
  from: string;
  keywords: string;
  prompt: string;
  sources: string[];
  to: string;
  title: string;
};

type ReportBlockDraft = ReportBlockFormValue & {
  clientId: string;
};

type CreateReportFormProps = {
  aiModels: CreateReportFormAiModel[];
  missingSourceNames?: string[];
  sources: CreateReportFormSource[];
  initialValues?: {
    blocks: Array<Omit<ReportBlockFormValue, "from" | "to"> & { from: number | null; to: number | null }>;
    description: string;
    id: string;
    period: RecurrenceValue;
    title: string;
  };
  mode?: "create" | "edit";
};

const emptyBlock: ReportBlockFormValue = {
  aiModel: "",
  from: "",
  keywords: "",
  prompt: "",
  sources: [],
  to: "",
  title: "",
};

const defaultRecurrenceValue: RecurrenceValue = {
  frequency: "daily",
  interval: 1,
  times: [],
};

function createBlockDraft(block?: Partial<ReportBlockFormValue>): ReportBlockDraft {
  return {
    ...emptyBlock,
    ...block,
    clientId: crypto.randomUUID(),
  };
}

function padDateTimePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTimeLocalValue(timestamp: number | null) {
  if (timestamp === null) {
    return "";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    `${date.getFullYear()}-${padDateTimePart(date.getMonth() + 1)}-${padDateTimePart(date.getDate())}`,
    `${padDateTimePart(date.getHours())}:${padDateTimePart(date.getMinutes())}`,
  ].join("T");
}

function parseDateTimeLocalValue(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmedValue);

  if (!match) {
    return "";
  }

  const [, year, month, day, hour, minute] = match;
  const timestamp = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0,
  ).getTime();

  return Number.isFinite(timestamp) ? String(timestamp) : "";
}

function normalizeSourceGroupValue(value: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function compareByLabel(left: { label: string }, right: { label: string }) {
  return left.label.localeCompare(right.label);
}

function buildSourceOptions({
  missingSourceNames,
  sources,
  unavailableLabel,
  withoutCountryLabel,
  withoutTypeLabel,
}: {
  missingSourceNames: string[];
  sources: CreateReportFormSource[];
  unavailableLabel: string;
  withoutCountryLabel: string;
  withoutTypeLabel: string;
}) {
  const countries = new Map<string, Map<string, MultiSelectOption[]>>();

  for (const source of sources) {
    const countryLabel = normalizeSourceGroupValue(source.country) ?? withoutCountryLabel;
    const typeLabel = normalizeSourceGroupValue(source.type) ?? withoutTypeLabel;
    const countryGroup = countries.get(countryLabel) ?? new Map<string, MultiSelectOption[]>();
    const typeGroup = countryGroup.get(typeLabel) ?? [];

    typeGroup.push({
      label: source.name,
      value: source.name,
    });
    countryGroup.set(typeLabel, typeGroup);
    countries.set(countryLabel, countryGroup);
  }

  const groupedOptions = [...countries.entries()]
    .map<MultiSelectOption>(([countryLabel, typeGroups]) => ({
      children: [...typeGroups.entries()]
        .map<MultiSelectOption>(([typeLabel, sourceOptions]) => ({
          children: [...sourceOptions].sort(compareByLabel),
          label: typeLabel,
          value: `country:${countryLabel}/type:${typeLabel}`,
        }))
        .sort(compareByLabel),
      label: countryLabel,
      value: `country:${countryLabel}`,
    }))
    .sort(compareByLabel);

  const uniqueMissingSourceNames = [...new Set(
    missingSourceNames.map((sourceName) => sourceName.trim()).filter(Boolean),
  )].sort((left, right) => left.localeCompare(right));

  if (uniqueMissingSourceNames.length > 0) {
    groupedOptions.push({
      children: uniqueMissingSourceNames.map((sourceName) => ({
        label: sourceName,
        value: sourceName,
      })),
      label: unavailableLabel,
      value: "unavailable-sources",
    });
  }

  return groupedOptions;
}

export function CreateReportForm({
  aiModels,
  missingSourceNames = [],
  sources,
  initialValues,
  mode = "create",
}: CreateReportFormProps) {
  const action = mode === "edit" ? submitUpdateReport : submitCreateReport;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [blocks, setBlocks] = useState<ReportBlockDraft[]>(() =>
    initialValues?.blocks.map((block) =>
      createBlockDraft({
        ...block,
        from: formatDateTimeLocalValue(block.from),
        to: formatDateTimeLocalValue(block.to),
      }),
    ) ?? [createBlockDraft()],
  );
  const [period, setPeriod] = useState<RecurrenceValue>(
    initialValues?.period ?? defaultRecurrenceValue,
  );
  const { backToPreviousPathnameOrReplace } = useNavigationHistory();
  const t = useTranslations();
  const errorMessage = translateActionMessage(t, state.error);
  const titleValue = initialValues?.title ?? "";
  const descriptionValue = initialValues?.description ?? "";
  const hasAiModels = aiModels.length > 0;
  const aiModelOptions = hasAiModels
    ? [
        { label: t("reports.form.block-ai-model-placeholder"), value: "" },
        ...aiModels,
      ]
    : [{ label: t("reports.form.no-ai-models"), value: "" }];
  const sourceOptions = useMemo(
    () =>
      buildSourceOptions({
        missingSourceNames,
        sources,
        unavailableLabel: t("reports.form.sources-unavailable"),
        withoutCountryLabel: t("reports.form.sources-without-country"),
        withoutTypeLabel: t("reports.form.sources-without-type"),
      }),
    [missingSourceNames, sources, t],
  );

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
      backToPreviousPathnameOrReplace({
        fallbackHref: routes.reports,
        pathname: routes.reports,
        refreshOnArrival: true,
      });
    }
  }, [backToPreviousPathnameOrReplace, state.success]);

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
                        selectedItemsModalCloseLabel={t(
                          "reports.form.selected-sources-modal-close",
                        )}
                        selectedItemsModalTitle={t(
                          "reports.form.selected-sources-modal-title",
                        )}
                        showAllSelectedLabel={(count) =>
                          t("reports.form.show-all-selected-sources", { count })
                        }
                        value={block.sources}
                        visibleSelectedOptionsCount={5}
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
                  <div className={styles["block-range-fields"]}>
                    <label className={styles["field"]}>
                      <span className={styles["field-label"]}>{t("reports.form.block-from")}</span>
                      <input
                        className={styles["field-input"]}
                        name="sunqar-report-block-from"
                        onChange={(event) => updateBlock(index, "from", event.currentTarget.value)}
                        type="datetime-local"
                        value={block.from}
                      />
                      <input
                        name="sunqar-report-block-from-timestamp"
                        type="hidden"
                        value={parseDateTimeLocalValue(block.from)}
                      />
                    </label>
                    <label className={styles["field"]}>
                      <span className={styles["field-label"]}>{t("reports.form.block-to")}</span>
                      <input
                        className={styles["field-input"]}
                        name="sunqar-report-block-to"
                        onChange={(event) => updateBlock(index, "to", event.currentTarget.value)}
                        type="datetime-local"
                        value={block.to}
                      />
                      <input
                        name="sunqar-report-block-to-timestamp"
                        type="hidden"
                        value={parseDateTimeLocalValue(block.to)}
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
                    <TrashIcon className={styles["delete-icon"]} />
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
        {errorMessage ? <p className={styles["form-error"]}>{errorMessage}</p> : null}
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
            onClick={() =>
              backToPreviousPathnameOrReplace({
                fallbackHref: routes.reports,
                pathname: routes.reports,
              })
            }
            type="button"
          >
            {t("reports.form.cancel")}
          </button>
        </div>
      </form>
    </section>
  );
}
