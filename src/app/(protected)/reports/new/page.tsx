import { CreateReportForm } from "@/components/reports";
import { listAiModels } from "@/lib/ai-models/ai-models";
import { requireRole } from "@/lib/auth/auth";
import { listSources } from "@/lib/sources/sources";

import styles from "./page.module.scss";

export default async function NewReportPage() {
  await requireRole(["admin", "user"]);
  const [aiModels, sources] = await Promise.all([listAiModels(), listSources()]);
  const activeAiModels = aiModels
    .filter((aiModel) => aiModel.isActive)
    .map((aiModel) => ({
      label: aiModel.displayName,
      value: aiModel.id,
    }));
  const sourceOptions = sources.map((source) => ({
    label: source.name,
    value: source.name,
  }));

  return (
    <section className={styles["new-report-page"]}>
      <CreateReportForm aiModels={activeAiModels} sourceOptions={sourceOptions} />
    </section>
  );
}
