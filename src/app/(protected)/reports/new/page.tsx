import { CreateReportForm } from "@/components/reports";
import { requireRole } from "@/lib/auth/auth";
import { listAiModels } from "@/lib/ai-models/ai-models";
import styles from "./page.module.scss";

export default async function NewReportPage() {
  await requireRole("user");
  const aiModels = await listAiModels();
  const activeAiModels = aiModels
    .filter((aiModel) => aiModel.isActive)
    .map((aiModel) => ({
      label: aiModel.displayName,
      value: aiModel.id,
    }));

  return (
    <section className={styles["new-report-page"]}>
      <CreateReportForm aiModels={activeAiModels} />
    </section>
  );
}
