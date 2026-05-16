import { listAiModels } from "@/lib/ai-models/ai-models";
import { requireRole } from "@/lib/auth/auth";

import { AiModelsPageView } from "./ai-models-page-view/ai-models-page-view";

export default async function AiModelsPage() {
  await requireRole("admin");

  const allAiModels = await listAiModels();

  return (
    <AiModelsPageView
      allAiModels={allAiModels.map(({ displayName, id, isActive, modelId, provider }) => ({
        displayName,
        id,
        isActive,
        modelId,
        provider,
      }))}
    />
  );
}
