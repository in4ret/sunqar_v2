"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/auth";
import { type ActionMessage, createActionMessage } from "@/lib/i18n/action-messages";
import { routes } from "@/lib/routes";
import {
  createSourceByAdmin,
  deleteSourceByAdmin,
  updateSourceByAdmin,
} from "@/lib/sources/sources";

export type SourceFormState = {
  error: ActionMessage | null;
  sourceId: string | null;
  success: ActionMessage | null;
};

export async function submitCreateSource(
  _previousState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  await requireRole("admin");
  const name = String(formData.get("sunqar-source-name") ?? "");
  const type = String(formData.get("sunqar-source-type") ?? "");
  const country = String(formData.get("sunqar-source-country") ?? "");
  const result = await createSourceByAdmin({ country, name, type });

  if (result.error) {
    return {
      error: createActionMessage(`errors.${result.error}`),
      sourceId: null,
      success: null,
    };
  }

  revalidatePath(routes.sources);

  return {
    error: null,
    sourceId: null,
    success: createActionMessage("messages.source-created", { name: result.sourceName }),
  };
}

export async function submitDeleteSource(
  _previousState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  await requireRole("admin");
  const id = String(formData.get("sunqar-source-id") ?? "");
  const result = await deleteSourceByAdmin(id);

  if (result.error) {
    return {
      error: createActionMessage(`errors.${result.error}`),
      sourceId: id,
      success: null,
    };
  }

  revalidatePath(routes.sources);

  return {
    error: null,
    sourceId: id,
    success: createActionMessage("messages.source-deleted", { name: result.sourceName }),
  };
}

export async function submitUpdateSource(
  _previousState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  await requireRole("admin");
  const id = String(formData.get("sunqar-source-id") ?? "");
  const name = String(formData.get("sunqar-source-name") ?? "");
  const type = String(formData.get("sunqar-source-type") ?? "");
  const country = String(formData.get("sunqar-source-country") ?? "");
  const result = await updateSourceByAdmin({ country, id, name, type });

  if (result.error) {
    return {
      error: createActionMessage(`errors.${result.error}`),
      sourceId: id,
      success: null,
    };
  }

  revalidatePath(routes.sources);

  return {
    error: null,
    sourceId: id,
    success: createActionMessage("messages.source-updated", { name: result.sourceName }),
  };
}
