import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { submitLogout } from "@/app/(protected)/actions";
import { getCurrentUser } from "@/lib/auth/auth";
import { LanguageSwitcher } from "../language-switcher/language-switcher";
import styles from "./header.module.css";

export async function Header() {
  const user = await getCurrentUser();
  const t = await getTranslations();
  const isAuthenticated = Boolean(user);
  const userRoleLabel = user
    ? user.role === "admin"
      ? t("common.roles.admin")
      : t("common.roles.user")
    : null;

  return (
    <header className={styles["site-header"]}>
      <div className={styles["header-inner"]}>
        <Link className={styles["brand-link"]} href="/">
          <span className={styles["brand-icon-shell"]} aria-hidden="true">
            <span className={styles["brand-icon"]} />
          </span>
          <span className={styles["brand-label"]}>Sunqar</span>
        </Link>
        <nav aria-label={t("header.primary-navigation")}>
          <ul className={styles["nav-list"]}>
            {isAuthenticated ? (
              <li>
                <Link className={styles["nav-link"]} href="/reports">
                  {t("header.reports")}
                </Link>
              </li>
            ) : null}
            {user?.role === "admin" ? (
              <li>
                <Link className={styles["nav-link"]} href="/users">
                  {t("header.users")}
                </Link>
              </li>
            ) : null}
            {user ? (
              <li className={styles["nav-user"]}>
                <span className={styles["user-badge"]}>
                  {user.displayName} ({user.login}) · {userRoleLabel}
                </span>
              </li>
            ) : null}
            <li className={styles["nav-language"]}>
              <LanguageSwitcher />
            </li>
            {isAuthenticated ? (
              <li>
                <form action={submitLogout}>
                  <button className={styles["logout-button"]} type="submit">
                    {t("header.logout")}
                  </button>
                </form>
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
    </header>
  );
}
