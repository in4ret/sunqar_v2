import crypto from "node:crypto";
import { db } from "../src/lib/db/client";
import { aiModels, type NewAiModel } from "../src/lib/db/schema";

const seedAiModels = [
  {
    provider: "openai",
    modelId: "gpt-5.4",
    displayName: "GPT-5.4",
  },
  {
    provider: "openai",
    modelId: "gpt-5.4-mini",
    displayName: "GPT-5.4 Mini",
  },
  {
    provider: "openai",
    modelId: "gpt-5.4-nano",
    displayName: "GPT-5.4 Nano",
  },
  {
    provider: "openai",
    modelId: "gpt-4.1",
    displayName: "GPT-4.1",
  },
  {
    provider: "openai",
    modelId: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
  },
  {
    provider: "openai",
    modelId: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
  },
] satisfies Array<Pick<NewAiModel, "provider" | "modelId" | "displayName">>;

async function main() {
  const now = new Date();

  for (const model of seedAiModels) {
    db.insert(aiModels)
      .values({
        ...model,
        createdAt: now,
        id: crypto.randomUUID(),
        isActive: true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [aiModels.provider, aiModels.modelId],
        set: {
          displayName: model.displayName,
          isActive: true,
          updatedAt: now,
        },
      })
      .run();
  }

  console.log(`Seeded ${seedAiModels.length} AI models.`);
}

main().catch((error) => {
  console.error("AI models seed failed.");
  console.error(error);
  process.exit(1);
});
