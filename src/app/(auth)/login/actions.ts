"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { login } from "@/lib/auth/auth";

export type LoginFormState = {
  error: string | null;
};

export async function submitLogin(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const t = await getTranslations();
  const loginValue = String(formData.get("auth-id") ?? "");
  const password = String(formData.get("auth-secret") ?? "");

  if (!loginValue || !password) {
    return {
      error: t("errors.login-required"),
    };
  }

  const result = await login(loginValue, password);

  if (result.error) {
    return {
      error: t(`errors.${result.error}`),
    };
  }

  redirect("/");
}
