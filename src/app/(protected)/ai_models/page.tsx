import { getTranslations } from "next-intl/server";
import { AiModelManager } from "@/components/ai-models";
import { requireRole } from "@/lib/auth/auth";
import { listAiModels } from "@/lib/ai-models/ai-models";
import styles from "./page.module.scss";

export default async function AiModelsPage() {
  await requireRole("admin");

  const t = await getTranslations();
  const allAiModels = await listAiModels();

  return (
    <section className={styles["ai-models-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles["eyebrow"]}>{t("ai-models.eyebrow")}</p>
          <h1 className={styles["title"]}>{t("ai-models.title")}</h1>
          <p className={styles["description"]}>{t("ai-models.description")}</p>
        </div>
      </div>
      <AiModelManager
        aiModels={allAiModels.map(
          ({ displayName, id, isActive, modelId, provider }) => ({
            displayName,
            id,
            isActive,
            modelId,
            provider,
          }),
        )}
      />
    </section>
  );
}
