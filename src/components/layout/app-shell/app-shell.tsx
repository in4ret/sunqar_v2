import { getTranslations } from "next-intl/server";
import { submitLogout } from "@/app/(protected)/actions";
import { getCurrentUser } from "@/lib/auth/auth";
import { Footer } from "../footer/footer";
import { Header } from "../header/header";
import { Sidebar } from "../sidebar/sidebar";

type AppShellProps = Readonly<{
  children: React.ReactNode;
  mainClassName?: string;
}>;

export async function AppShell({ children, mainClassName = "app-main" }: AppShellProps) {
  const user = await getCurrentUser();
  const t = await getTranslations();
  const homeHref = "/";
  const userRoleLabel =
    user?.role === "admin" ? t("common.roles.admin") : t("common.roles.user");
  const navigationItems = [
    ...(user?.role === "user"
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
          {
            href: "/sources",
            label: t("header.sources"),
          },
          {
            href: "/ai_models",
            label: t("header.ai-models"),
          },
        ]
      : []),
  ];
  const hasSidebar = Boolean(user && navigationItems.length > 0);

  return (
    <div className={hasSidebar ? "app-shell app-shell-with-sidebar" : "app-shell"}>
      {user && hasSidebar ? (
        <Sidebar
          brandHref={homeHref}
          closeLabel={t("header.close-menu")}
          items={navigationItems}
          navigationLabel={t("header.primary-navigation")}
          openLabel={t("header.open-menu")}
          user={{
            displayName: user.displayName,
            isAdmin: user.role === "admin",
            login: user.login,
            logoutAction: submitLogout,
            logoutLabel: t("header.logout"),
            roleLabel: userRoleLabel,
          }}
        />
      ) : null}
      <div className="app-content-shell">
        <Header
          brandHref={homeHref}
          closeSidebarLabel={t("header.close-menu")}
          hasSidebar={hasSidebar}
          openSidebarLabel={t("header.open-menu")}
        />
        <main className={mainClassName}>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
