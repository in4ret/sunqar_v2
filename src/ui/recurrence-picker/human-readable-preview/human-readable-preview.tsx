"use client";

import { useLocale, useTranslations } from "next-intl";
import type { RecurrenceValue } from "../recurrence-picker.types";
import { formatRecurrenceLabel } from "../format-recurrence-label";
import styles from "./human-readable-preview.module.scss";

type HumanReadablePreviewProps = {
  value: RecurrenceValue;
};

export function HumanReadablePreview({ value }: HumanReadablePreviewProps) {
  const locale = useLocale();
  const t = useTranslations("recurrence-picker");
  const previewText = formatRecurrenceLabel({ locale, t, value });

  return (
    <section className={styles["preview"]}>
      <p className={styles["label"]}>{t("preview.label")}</p>
      <p className={styles["text"]}>{previewText}</p>
    </section>
  );
}
