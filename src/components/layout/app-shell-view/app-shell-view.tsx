"use client";

import { useTranslations } from "next-intl";

import { submitLogout } from "@/app/(protected)/actions";
import { routes } from "@/lib/routes";

import { Footer } from "../footer/footer";
import { Header } from "../header/header";
import { HeaderTasksProvider } from "../header-tasks-provider/header-tasks-provider";
import { Sidebar } from "../sidebar/sidebar";

type AppShellViewUser = {
  displayName: string;
  login: string;
  role: "admin" | "user";
};

type AppShellViewProps = Readonly<{
  children: React.ReactNode;
  mainClassName?: string;
  user: AppShellViewUser | null;
}>;

export function AppShellView({
  children,
  mainClassName = "app-main",
  user,
}: AppShellViewProps) {
  const t = useTranslations();
  const homeHref = routes.home;
  const userRoleLabel =
    user?.role === "admin" ? t("common.roles.admin") : t("common.roles.user");
  const userNavigationItems = [
    {
      href: routes.reports,
      label: t("header.reports"),
    },
  ];
  const adminNavigationItems = [
    {
      href: routes.users,
      label: t("header.users"),
    },
    {
      href: routes.sources,
      label: t("header.sources"),
    },
    {
      href: routes.aiModels,
      label: t("header.ai-models"),
    },
  ];
  const navigationSections = [
    ...(user?.role === "user"
      ? [
          {
            items: userNavigationItems,
          },
        ]
      : []),
    ...(user?.role === "admin"
      ? [
          {
            items: userNavigationItems,
          },
          {
            eyebrow: t("header.admin-navigation"),
            items: adminNavigationItems,
          },
        ]
      : []),
  ];
  const hasSidebar = Boolean(
    user && navigationSections.some((section) => section.items.length > 0),
  );

  return (
    <HeaderTasksProvider>
      <div className={hasSidebar ? "app-shell app-shell-with-sidebar" : "app-shell"}>
        {user && hasSidebar ? (
          <Sidebar
            brandHref={homeHref}
            closeLabel={t("header.close-menu")}
            navigationLabel={t("header.primary-navigation")}
            openLabel={t("header.open-menu")}
            sections={navigationSections}
            user={{
              accountHref: routes.account,
              accountLabel: t("header.account"),
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
          <Header brandHref={homeHref} hasSidebar={hasSidebar} />
          <main className={mainClassName}>{children}</main>
          <Footer />
        </div>
      </div>
    </HeaderTasksProvider>
  );
}
