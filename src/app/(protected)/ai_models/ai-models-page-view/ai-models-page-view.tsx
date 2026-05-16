"use client";

import { useTranslations } from "next-intl";

import { AiModelManager } from "@/components/ai-models";

import styles from "../page.module.scss";

type AiModelView = {
  displayName: string;
  id: string;
  isActive: boolean;
  modelId: string;
  provider: string;
};

type AiModelsPageViewProps = {
  allAiModels: AiModelView[];
};

export function AiModelsPageView({ allAiModels }: AiModelsPageViewProps) {
  const t = useTranslations();

  return (
    <section className={styles["ai-models-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles["eyebrow"]}>{t("ai-models.eyebrow")}</p>
          <h1 className={styles["title"]}>{t("ai-models.title")}</h1>
          <p className={styles["description"]}>{t("ai-models.description")}</p>
        </div>
      </div>
      <AiModelManager aiModels={allAiModels} />
    </section>
  );
}
