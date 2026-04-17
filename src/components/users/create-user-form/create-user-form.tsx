"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  submitCreateUser,
  type CreateUserFormState,
} from "@/app/(protected)/users/actions";
import { Dropdown } from "@/ui";
import styles from "./create-user-form.module.css";

const initialState: CreateUserFormState = {
  error: null,
  success: null,
};

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(submitCreateUser, initialState);
  const t = useTranslations();
  const roleOptions = [
    { value: "user", label: t("common.roles.user") },
    { value: "admin", label: t("common.roles.admin") },
  ];

  return (
    <section className={styles["form-card"]}>
      <div className={styles["form-copy"]}>
        <h2 className={styles["form-title"]}>{t("users.form.title")}</h2>
        <p className={styles["form-description"]}>{t("users.form.description")}</p>
      </div>
      <form className={styles["form-grid"]} action={formAction}>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("users.form.display-name")}</span>
          <input className={styles["field-input"]} name="display-name" required type="text" />
        </label>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("users.form.login")}</span>
          <input className={styles["field-input"]} name="login" required type="text" />
        </label>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("users.form.password")}</span>
          <input
            className={styles["field-input"]}
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        <label className={styles["field"]}>
          <span className={styles["field-label"]}>{t("users.form.role")}</span>
          <Dropdown defaultValue="user" name="role" options={roleOptions} />
        </label>
        {state.error ? <p className={styles["form-error"]}>{state.error}</p> : null}
        {state.success ? <p className={styles["form-success"]}>{state.success}</p> : null}
        <button className={styles["submit-button"]} disabled={isPending} type="submit">
          {isPending ? t("users.form.submitting") : t("users.form.submit")}
        </button>
      </form>
    </section>
  );
}
