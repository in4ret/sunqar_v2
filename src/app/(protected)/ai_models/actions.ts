"use server";

import { revalidatePath } from "next/cache";

import {
  createAiModelByAdmin,
  deleteAiModelByAdmin,
  updateAiModelByAdmin,
} from "@/lib/ai-models/ai-models";
import { requireRole } from "@/lib/auth/auth";
import { type ActionMessage,createActionMessage } from "@/lib/i18n/action-messages";
import { routes } from "@/lib/routes";

export type AiModelFormState = {
  aiModelId: string | null;
  error: ActionMessage | null;
  success: ActionMessage | null;
};

const aiModelsPath = routes.aiModels;

function getIsActive(formData: FormData) {
  return formData.get("isActive") === "on";
}

export async function submitCreateAiModel(
  _previousState: AiModelFormState,
  formData: FormData,
): Promise<AiModelFormState> {
  await requireRole("admin");
  const result = await createAiModelByAdmin({
    displayName: String(formData.get("displayName") ?? ""),
    isActive: getIsActive(formData),
    modelId: String(formData.get("modelId") ?? ""),
    provider: String(formData.get("provider") ?? ""),
  });

  if (result.error) {
    return {
      aiModelId: null,
      error: createActionMessage(`errors.${result.error}`),
      success: null,
    };
  }

  revalidatePath(aiModelsPath);

  return {
    aiModelId: null,
    error: null,
    success: createActionMessage("messages.ai-model-created", { name: result.aiModelName }),
  };
}

export async function submitUpdateAiModel(
  _previousState: AiModelFormState,
  formData: FormData,
): Promise<AiModelFormState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const result = await updateAiModelByAdmin({
    displayName: String(formData.get("displayName") ?? ""),
    id,
    isActive: getIsActive(formData),
    modelId: String(formData.get("modelId") ?? ""),
    provider: String(formData.get("provider") ?? ""),
  });

  if (result.error) {
    return {
      aiModelId: id,
      error: createActionMessage(`errors.${result.error}`),
      success: null,
    };
  }

  revalidatePath(aiModelsPath);

  return {
    aiModelId: id,
    error: null,
    success: createActionMessage("messages.ai-model-updated", { name: result.aiModelName }),
  };
}

export async function submitDeleteAiModel(
  _previousState: AiModelFormState,
  formData: FormData,
): Promise<AiModelFormState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const result = await deleteAiModelByAdmin(id);

  if (result.error) {
    return {
      aiModelId: id,
      error: createActionMessage(`errors.${result.error}`),
      success: null,
    };
  }

  revalidatePath(aiModelsPath);

  return {
    aiModelId: id,
    error: null,
    success: createActionMessage("messages.ai-model-deleted", { name: result.aiModelName }),
  };
}
