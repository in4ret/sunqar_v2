"use server";

import { revalidatePath } from "next/cache";

import { createUserByAdmin, requireRole } from "@/lib/auth/auth";
import { type ActionMessage,createActionMessage } from "@/lib/i18n/action-messages";
import { routes } from "@/lib/routes";

export type CreateUserFormState = {
  error: ActionMessage | null;
  success: ActionMessage | null;
};

export async function submitCreateUser(
  _previousState: CreateUserFormState,
  formData: FormData,
): Promise<CreateUserFormState> {
  await requireRole("admin");

  const displayName = String(formData.get("display-name") ?? "");
  const login = String(formData.get("login") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (role !== "user" && role !== "admin") {
    return {
      error: createActionMessage("errors.invalid-role"),
      success: null,
    };
  }

  const result = await createUserByAdmin({
    displayName,
    login,
    password,
    role,
  });

  if (result.error) {
    return {
      error: createActionMessage(`errors.${result.error}`),
      success: null,
    };
  }

  revalidatePath(routes.users);

  return {
    error: null,
    success: createActionMessage("messages.user-created"),
  };
}
