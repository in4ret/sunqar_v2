"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/auth";
import { type ActionMessage,createActionMessage } from "@/lib/i18n/action-messages";
import { routes } from "@/lib/routes";
import {
  createSourcesByAdmin,
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
  const names = String(formData.get("name") ?? "");
  const result = await createSourcesByAdmin({ names });

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
    success:
      result.sourceNames.length === 1
        ? createActionMessage("messages.source-created", { name: result.sourceNames[0] })
        : createActionMessage("messages.sources-created", { count: result.sourceNames.length }),
  };
}

export async function submitUpdateSource(
  _previousState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const result = await updateSourceByAdmin({ id, name });

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

export async function submitDeleteSource(
  _previousState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
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
