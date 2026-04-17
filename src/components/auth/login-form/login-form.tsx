"use client";

import { type FocusEvent, useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitLogin, type LoginFormState } from "@/app/(auth)/login/actions";
import styles from "./login-form.module.css";

const initialState: LoginFormState = {
  error: null,
};

function unlockField(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.removeAttribute("readonly");
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(submitLogin, initialState);
  const t = useTranslations();

  return (
    <form autoComplete="off" className={styles["login-form"]} action={formAction}>
      <label className={styles["field"]}>
        <span className={styles["field-label"]}>{t("login.login-label")}</span>
        <input
          required
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          className={styles["field-input"]}
          name="auth-id"
          onFocus={unlockField}
          readOnly
          type="text"
        />
      </label>
      <label className={styles["field"]}>
        <span className={styles["field-label"]}>{t("login.password-label")}</span>
        <input
          required
          autoComplete="new-password"
          className={styles["field-input"]}
          minLength={8}
          name="auth-secret"
          onFocus={unlockField}
          readOnly
          type="password"
        />
      </label>
      {state.error ? <p className={styles["form-error"]}>{state.error}</p> : null}
      <button className={styles["submit-button"]} disabled={isPending} type="submit">
        {isPending ? t("login.submitting") : t("login.submit")}
      </button>
    </form>
  );
}
