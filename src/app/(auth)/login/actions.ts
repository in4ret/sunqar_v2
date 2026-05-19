"use server";

import { redirect } from "next/navigation";

import { getCurrentUser, login } from "@/lib/auth/auth";
import { type ActionMessage,createActionMessage } from "@/lib/i18n/action-messages";
import { routes } from "@/lib/routes";

export type LoginFormState = {
  error: ActionMessage | null;
};

export async function submitLogin(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const loginValue = String(formData.get("auth-id") ?? "");
  const password = String(formData.get("auth-secret") ?? "");

  if (!loginValue || !password) {
    return {
      error: createActionMessage("errors.login-required"),
    };
  }

  const result = await login(loginValue, password);

  if (result.error) {
    return {
      error: createActionMessage(`errors.${result.error}`),
    };
  }

  const user = await getCurrentUser();

  redirect(user ? routes.home : routes.login);
}
