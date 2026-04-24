"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/auth";
import {
  createSourcesByAdmin,
  deleteSourceByAdmin,
  updateSourceByAdmin,
} from "@/lib/sources/sources";

export type SourceFormState = {
  error: string | null;
  sourceId: string | null;
  success: string | null;
};

export async function submitCreateSource(
  _previousState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  await requireRole("admin");
  const t = await getTranslations();
  const names = String(formData.get("name") ?? "");
  const result = await createSourcesByAdmin({ names });

  if (result.error) {
    return {
      error: t(`errors.${result.error}`),
      sourceId: null,
      success: null,
    };
  }

  revalidatePath("/sources");

  return {
    error: null,
    sourceId: null,
    success:
      result.sourceNames.length === 1
        ? t("messages.source-created", { name: result.sourceNames[0] })
        : t("messages.sources-created", { count: result.sourceNames.length }),
  };
}

export async function submitUpdateSource(
  _previousState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  await requireRole("admin");
  const t = await getTranslations();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const result = await updateSourceByAdmin({ id, name });

  if (result.error) {
    return {
      error: t(`errors.${result.error}`),
      sourceId: id,
      success: null,
    };
  }

  revalidatePath("/sources");

  return {
    error: null,
    sourceId: id,
    success: t("messages.source-updated", { name: result.sourceName }),
  };
}

export async function submitDeleteSource(
  _previousState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  await requireRole("admin");
  const t = await getTranslations();
  const id = String(formData.get("id") ?? "");
  const result = await deleteSourceByAdmin(id);

  if (result.error) {
    return {
      error: t(`errors.${result.error}`),
      sourceId: id,
      success: null,
    };
  }

  revalidatePath("/sources");

  return {
    error: null,
    sourceId: id,
    success: t("messages.source-deleted", { name: result.sourceName }),
  };
}
