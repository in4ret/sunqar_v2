import { notFound } from "next/navigation";

import { CreateReportForm } from "@/components/reports";
import { listAiModels } from "@/lib/ai-models/ai-models";
import { requireRole } from "@/lib/auth/auth";
import { getReportById, parseStoredReportPeriod } from "@/lib/reports";
import { listSources } from "@/lib/sources/sources";

import styles from "./page.module.scss";

type EditReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditReportPage({ params }: EditReportPageProps) {
  const user = await requireRole(["admin", "user"]);
  const { id } = await params;
  const [report, aiModels, sources] = await Promise.all([
    getReportById(id, user.id),
    listAiModels(),
    listSources(),
  ]);

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
  const knownSourceNames = new Set(sources.map((source) => source.name));
  const missingSourceNames = report.blocks.flatMap((block) =>
    block.sources.filter((sourceName) => !knownSourceNames.has(sourceName)),
  );

  return (
    <section className={styles["edit-report-page"]}>
      <CreateReportForm
        aiModels={activeAiModels}
        initialValues={{
          blocks: report.blocks.map((block) => ({
            aiModel: block.aiModel,
            from: block.from,
            keywords: block.keywords.join(", "),
            prompt: block.prompt,
            sources: block.sources,
            to: block.to,
            title: block.title,
          })),
          description: report.description,
          id: report.id,
          period: parseStoredReportPeriod(report.period),
          title: report.title,
        }}
        missingSourceNames={missingSourceNames}
        mode="edit"
        sources={sources.map(({ country, name, type }) => ({
          country,
          name,
          type,
        }))}
      />
    </section>
  );
}
