import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/auth";
import styles from "./page.module.css";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const t = await getTranslations();
  const displayName = user?.displayName ?? user?.login ?? "User";
  const roleLabel =
    (user?.role ?? "user") === "admin" ? t("common.roles.admin") : t("common.roles.user");
  const activeStatusLabel = t("common.statuses.active");

  return (
    <section className={styles["dashboard-page"]}>
      <div className={styles["hero-panel"]}>
        <p className={styles["eyebrow"]}>{t("dashboard.eyebrow")}</p>
        <h1 className={styles["title"]}>{t("dashboard.title", { name: displayName })}</h1>
        <p className={styles["description"]}>{t("dashboard.description")}</p>
        <div className={styles["meta-row"]}>
          <span className={styles["meta-pill"]}>{t("dashboard.role", { role: roleLabel })}</span>
          <span className={styles["meta-pill"]}>
            {t("dashboard.status", { status: activeStatusLabel })}
          </span>
        </div>
      </div>
      {user?.role === "admin" ? (
        <section className={styles["admin-panel"]}>
          <div>
            <h2 className={styles["section-title"]}>{t("dashboard.admin-title")}</h2>
            <p className={styles["section-copy"]}>{t("dashboard.admin-description")}</p>
          </div>
          <Link className={styles["action-link"]} href="/users">
            {t("dashboard.admin-link")}
          </Link>
        </section>
      ) : null}
    </section>
  );
}
