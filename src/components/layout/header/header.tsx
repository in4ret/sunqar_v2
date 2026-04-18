import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { submitLogout } from "@/app/(protected)/actions";
import { getCurrentUser } from "@/lib/auth/auth";
import { HeaderUserMenu } from "./header-user-menu";
import { LanguageSwitcher } from "../language-switcher/language-switcher";
import { MobileNavigation } from "../mobile-navigation/mobile-navigation";
import styles from "./header.module.scss";

export async function Header() {
  const user = await getCurrentUser();
  const t = await getTranslations();
  const isAuthenticated = Boolean(user);
  const userRoleLabel =
    user?.role === "admin" ? t("common.roles.admin") : t("common.roles.user");
  const mobileNavigationItems = [
    ...(isAuthenticated
      ? [
          {
            href: "/reports",
            label: t("header.reports"),
          },
        ]
      : []),
    ...(user?.role === "admin"
      ? [
          {
            href: "/users",
            label: t("header.users"),
          },
        ]
      : []),
  ];

  return (
    <header className={styles["site-header"]}>
      <div className={styles["header-inner"]}>
        <MobileNavigation
          closeLabel={t("header.close-menu")}
          items={mobileNavigationItems}
          menuLabel={t("header.menu")}
          navigationLabel={t("header.primary-navigation")}
          openLabel={t("header.open-menu")}
        />
        <Link className={styles["brand-link"]} href="/">
          <span className={styles["brand-icon-shell"]} aria-hidden="true">
            <span className={styles["brand-icon"]} />
          </span>
          <span className={styles["brand-label"]}>Sunqar</span>
        </Link>
        <nav
          aria-label={t("header.primary-navigation")}
          className={styles["desktop-navigation"]}
        >
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
            <li className={styles["nav-language"]}>
              <LanguageSwitcher />
            </li>
            {user ? (
              <li className={styles["nav-user"]}>
                <HeaderUserMenu
                  displayName={user.displayName}
                  isAdmin={user.role === "admin"}
                  login={user.login}
                  logoutAction={submitLogout}
                  logoutLabel={t("header.logout")}
                  roleLabel={userRoleLabel}
                />
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
    </header>
  );
}
