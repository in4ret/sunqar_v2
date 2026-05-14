"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  createAiModelByAdmin,
  deleteAiModelByAdmin,
  updateAiModelByAdmin,
} from "@/lib/ai-models/ai-models";
import { requireRole } from "@/lib/auth/auth";
import { routes } from "@/lib/routes";

export type AiModelFormState = {
  aiModelId: string | null;
  error: string | null;
  success: string | null;
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
  const t = await getTranslations();
  const result = await createAiModelByAdmin({
    displayName: String(formData.get("displayName") ?? ""),
    isActive: getIsActive(formData),
    modelId: String(formData.get("modelId") ?? ""),
    provider: String(formData.get("provider") ?? ""),
  });

  if (result.error) {
    return {
      aiModelId: null,
      error: t(`errors.${result.error}`),
      success: null,
    };
  }

  revalidatePath(aiModelsPath);

  return {
    aiModelId: null,
    error: null,
    success: t("messages.ai-model-created", { name: result.aiModelName }),
  };
}

export async function submitUpdateAiModel(
  _previousState: AiModelFormState,
  formData: FormData,
): Promise<AiModelFormState> {
  await requireRole("admin");
  const t = await getTranslations();
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
      error: t(`errors.${result.error}`),
      success: null,
    };
  }

  revalidatePath(aiModelsPath);

  return {
    aiModelId: id,
    error: null,
    success: t("messages.ai-model-updated", { name: result.aiModelName }),
  };
}

export async function submitDeleteAiModel(
  _previousState: AiModelFormState,
  formData: FormData,
): Promise<AiModelFormState> {
  await requireRole("admin");
  const t = await getTranslations();
  const id = String(formData.get("id") ?? "");
  const result = await deleteAiModelByAdmin(id);

  if (result.error) {
    return {
      aiModelId: id,
      error: t(`errors.${result.error}`),
      success: null,
    };
  }

  revalidatePath(aiModelsPath);

  return {
    aiModelId: id,
    error: null,
    success: t("messages.ai-model-deleted", { name: result.aiModelName }),
  };
}
