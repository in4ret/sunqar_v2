import { notFound } from "next/navigation";
import { CreateReportForm } from "@/components/reports";
import { listAiModels } from "@/lib/ai-models/ai-models";
import { requireRole } from "@/lib/auth/auth";
import { getReportById, parseStoredReportPeriod } from "@/lib/reports";
import styles from "./page.module.scss";

type EditReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditReportPage({ params }: EditReportPageProps) {
  await requireRole("user");
  const { id } = await params;
  const [report, aiModels] = await Promise.all([getReportById(id), listAiModels()]);

  if (!report) {
    notFound();
  }

  const selectedAiModelIds = new Set(report.blocks.map((block) => block.aiModel));
  const activeAiModels = aiModels
    .filter((aiModel) => aiModel.isActive || selectedAiModelIds.has(aiModel.id))
    .map((aiModel) => ({
      label: aiModel.displayName,
      value: aiModel.id,
    }));

  return (
    <section className={styles["edit-report-page"]}>
      <CreateReportForm
        aiModels={activeAiModels}
        initialValues={{
          blocks: report.blocks.map((block) => ({
            aiModel: block.aiModel,
            keywords: block.keywords.join(", "),
            prompt: block.prompt,
            sources: block.sources.join(", "),
            title: block.title,
          })),
          description: report.description,
          id: report.id,
          period: parseStoredReportPeriod(report.period),
          title: report.title,
        }}
        mode="edit"
      />
    </section>
  );
}
