"use client";

import { useTranslations } from "next-intl";

import { submitLogout } from "@/app/(protected)/actions";
import { routes } from "@/lib/routes";
import {
  BotIcon,
  ChartPieIcon,
  DatabaseIcon,
  FileTextIcon,
  HouseIcon,
  NewspaperIcon,
  TextIcon,
  UsersIcon,
} from "@/ui";

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
      href: routes.home,
      icon: HouseIcon,
      label: t("header.home"),
    },
    {
      href: routes.reports,
      icon: FileTextIcon,
      label: t("header.reports"),
    },
    {
      href: routes.comments,
      icon: TextIcon,
      label: t("header.comments"),
    },
    {
      children: [
        {
          href: routes.newsChart,
          icon: ChartPieIcon,
          label: t("news.tabs.chart"),
        },
        {
          href: routes.newsText,
          icon: TextIcon,
          label: t("news.tabs.text"),
        },
      ],
      href: routes.news,
      icon: NewspaperIcon,
      label: t("header.news"),
    },
  ];
  const adminNavigationItems = [
    {
      href: routes.posts,
      icon: TextIcon,
      label: t("header.posts"),
    },
    {
      href: routes.users,
      icon: UsersIcon,
      label: t("header.users"),
    },
    {
      href: routes.sources,
      icon: DatabaseIcon,
      label: t("header.sources"),
    },
    {
      href: routes.aiModels,
      icon: BotIcon,
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
