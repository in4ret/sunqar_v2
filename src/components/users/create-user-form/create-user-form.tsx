"use client";

import { type FocusEvent, useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  submitCreateUser,
  type CreateUserFormState,
} from "@/app/(protected)/users/actions";
import { Dropdown, useToast } from "@/ui";
import styles from "./create-user-form.module.scss";

const initialState: CreateUserFormState = {
  error: null,
  success: null,
};

function unlockField(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.removeAttribute("readonly");
}

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(submitCreateUser, initialState);
  const { showToast } = useToast();
  const t = useTranslations();
  const roleOptions = [
    { value: "user", label: t("common.roles.user") },
    { value: "admin", label: t("common.roles.admin") },
  ];

  useEffect(() => {
    if (state.success) {
      showToast({ message: state.success, status: "success" });
    }
  }, [showToast, state]);

  return (
    <section className={styles["form-card"]}>
      <div className={styles["form-copy"]}>
        <h2 className={styles["form-title"]}>{t("users.form.title")}</h2>
        <p className={styles["form-description"]}>{t("users.form.description")}</p>
      </div>
      <form autoComplete="off" className={styles["form-grid"]} action={formAction}>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("users.form.display-name")}</span>
          <input
            autoComplete="off"
            className={styles["field-input"]}
            name="display-name"
            onFocus={unlockField}
            readOnly
            required
            type="text"
          />
        </label>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("users.form.login")}</span>
          <input
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className={styles["field-input"]}
            name="login"
            onFocus={unlockField}
            readOnly
            required
            type="text"
          />
        </label>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("users.form.password")}</span>
          <input
            autoComplete="new-password"
            className={styles["field-input"]}
            minLength={8}
            name="password"
            onFocus={unlockField}
            readOnly
            required
            type="password"
          />
        </label>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("users.form.role")}</span>
          <Dropdown defaultValue="user" name="role" options={roleOptions} />
        </label>
        {state.error ? <p className={styles["form-error"]}>{state.error}</p> : null}
        <button className={styles["submit-button"]} disabled={isPending} type="submit">
          {isPending ? t("users.form.submitting") : t("users.form.submit")}
        </button>
      </form>
    </section>
  );
}
