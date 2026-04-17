import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth";
import { getCurrentUser } from "@/lib/auth/auth";
import styles from "./page.module.css";

export default async function LoginPage() {
  const user = await getCurrentUser();
  const t = await getTranslations();

  if (user) {
    redirect("/");
  }

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
