import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth/auth";
import styles from "./page.module.scss";

export default async function LoginPage() {
  const user = await getCurrentUser();
  const t = await getTranslations();

  if (user) {
    redirect(getDefaultRouteForRole(user.role));
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
