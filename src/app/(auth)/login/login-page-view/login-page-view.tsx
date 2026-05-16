"use client";

import { useTranslations } from "next-intl";

import { LoginForm } from "@/components/auth";

import styles from "../page.module.scss";

export function LoginPageView() {
  const t = useTranslations();

  return (
    <section className={styles["login-page"]}>
      <section className={styles["login-card"]}>
        <div className={styles["login-copy"]}>
          <p className={styles["eyebrow"]}>{t("login.eyebrow")}</p>
          <h1 className={styles["title"]}>{t("login.title")}</h1>
          <p className={styles["description"]}>{t("login.description")}</p>
        </div>
        <LoginForm />
      </section>
    </section>
  );
}
