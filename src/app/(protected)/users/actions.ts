"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { requireRole, createUserByAdmin } from "@/lib/auth/auth";

export type CreateUserFormState = {
  error: string | null;
  success: string | null;
};

export async function submitCreateUser(
  _previousState: CreateUserFormState,
  formData: FormData,
): Promise<CreateUserFormState> {
  await requireRole("admin");
  const t = await getTranslations();

  const displayName = String(formData.get("display-name") ?? "");
  const login = String(formData.get("login") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (role !== "user" && role !== "admin") {
    return {
      error: t("errors.invalid-role"),
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
      error: t(`errors.${result.error}`),
      success: null,
    };
  }

  revalidatePath("/users");

  return {
    error: null,
    success: t("messages.user-created"),
  };
}
