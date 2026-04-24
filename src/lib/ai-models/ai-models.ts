import crypto from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiModels } from "@/lib/db/schema";

export type AiModelMutationErrorCode =
  | "ai-model-fields-required"
  | "ai-model-exists"
  | "ai-model-not-found";

export async function listAiModels() {
  return db
    .select()
    .from(aiModels)
    .orderBy(asc(aiModels.provider), asc(aiModels.displayName))
    .all();
}

function normalizeAiModelInput(input: {
  displayName: string;
  isActive: boolean;
  modelId: string;
  provider: string;
}) {
  return {
    displayName: input.displayName.trim(),
    isActive: input.isActive,
    modelId: input.modelId.trim(),
    provider: input.provider.trim(),
  };
}

function findAiModelByProviderAndModelId(input: {
  modelId: string;
  provider: string;
}) {
  return db
    .select()
    .from(aiModels)
    .where(
      and(
        eq(aiModels.provider, input.provider),
        eq(aiModels.modelId, input.modelId),
      ),
    )
    .get();
}

export async function createAiModelByAdmin(input: {
  displayName: string;
  isActive: boolean;
  modelId: string;
  provider: string;
}) {
  const model = normalizeAiModelInput(input);

  if (!model.provider || !model.modelId || !model.displayName) {
    return { error: "ai-model-fields-required" as AiModelMutationErrorCode };
  }

  const existingModel = findAiModelByProviderAndModelId(model);

  if (existingModel) {
    return { error: "ai-model-exists" as AiModelMutationErrorCode };
  }

  const now = new Date();

  db.insert(aiModels)
    .values({
      ...model,
      createdAt: now,
      id: crypto.randomUUID(),
      updatedAt: now,
    })
    .run();

  return { error: null, aiModelName: model.displayName };
}

export async function updateAiModelByAdmin(input: {
  displayName: string;
  id: string;
  isActive: boolean;
  modelId: string;
  provider: string;
}) {
  const id = input.id.trim();
  const model = normalizeAiModelInput(input);

  if (!id || !model.provider || !model.modelId || !model.displayName) {
    return { error: "ai-model-fields-required" as AiModelMutationErrorCode };
  }

  const currentModel = db
    .select()
    .from(aiModels)
    .where(eq(aiModels.id, id))
    .get();

  if (!currentModel) {
    return { error: "ai-model-not-found" as AiModelMutationErrorCode };
  }

  const existingModel = findAiModelByProviderAndModelId(model);

  if (existingModel && existingModel.id !== id) {
    return { error: "ai-model-exists" as AiModelMutationErrorCode };
  }

  db.update(aiModels)
    .set({
      ...model,
      updatedAt: new Date(),
    })
    .where(eq(aiModels.id, id))
    .run();

  return { error: null, aiModelName: model.displayName };
}

export async function deleteAiModelByAdmin(idValue: string) {
  const id = idValue.trim();

  if (!id) {
    return { error: "ai-model-not-found" as AiModelMutationErrorCode };
  }

  const model = db.select().from(aiModels).where(eq(aiModels.id, id)).get();

  if (!model) {
    return { error: "ai-model-not-found" as AiModelMutationErrorCode };
  }

  db.delete(aiModels).where(eq(aiModels.id, id)).run();

  return { error: null, aiModelName: model.displayName };
}
