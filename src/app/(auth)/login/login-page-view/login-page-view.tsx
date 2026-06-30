"use client";

import { LoginForm } from "@/components/auth";

import styles from "../page.module.scss";

export function LoginPageView() {
  return (
    <section className={styles["login-page"]}>
      <section className={styles["login-card"]}>
        <LoginForm />
      </section>
    </section>
  );
}
