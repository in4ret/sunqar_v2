"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { routes } from "@/lib/routes";
import type { HeaderTaskItem } from "@/lib/tasks";

import { LanguageSwitcher } from "../language-switcher/language-switcher";
import {
  SIDEBAR_STATE_EVENT,
  SIDEBAR_TOGGLE_EVENT,
  type SidebarStateDetail,
} from "../sidebar/sidebar-events";
import { TaskNotifications } from "../task-notifications/task-notifications";

import styles from "./header.module.scss";

type HeaderProps = {
  brandHref?: string;
  hasSidebar?: boolean;
  tasks: HeaderTaskItem[];
};

export function Header({
  brandHref = routes.home,
  hasSidebar = false,
  tasks,
}: HeaderProps) {
  const t = useTranslations();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!hasSidebar) {
      return;
    }

    function handleSidebarStateChange(event: Event) {
      const customEvent = event as CustomEvent<SidebarStateDetail>;

      setIsSidebarCollapsed(customEvent.detail.isCollapsed);
      setIsSidebarOpen(customEvent.detail.isOpen);
    }

    window.addEventListener(SIDEBAR_STATE_EVENT, handleSidebarStateChange as EventListener);

    return () => {
      window.removeEventListener(
        SIDEBAR_STATE_EVENT,
        handleSidebarStateChange as EventListener,
      );
    };
  }, [hasSidebar]);

  useEffect(() => {
    if (!hasSidebar) {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const updateViewportState = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    updateViewportState();
    mediaQuery.addEventListener("change", updateViewportState);

    return () => {
      mediaQuery.removeEventListener("change", updateViewportState);
    };
  }, [hasSidebar]);

  const isSidebarExpanded = isMobileViewport ? isSidebarOpen : !isSidebarCollapsed;
  const sidebarToggleLabel = isSidebarExpanded
    ? t("header.close-menu")
    : t("header.open-menu");
  const shouldShowSidebarControls = !hasSidebar || isMobileViewport || !isSidebarExpanded;

  return (
    <header className={styles["site-header"]}>
      <div
        className={styles["header-inner"]}
      >
        {shouldShowSidebarControls ? (
          <div className={styles["brand-group"]}>
            {hasSidebar ? (
              <button
                aria-expanded={isSidebarExpanded}
                aria-label={sidebarToggleLabel}
                className={styles["sidebar-toggle-button"]}
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent(SIDEBAR_TOGGLE_EVENT));
                }}
              >
                <span className={styles["sidebar-toggle-icon"]} aria-hidden="true" />
              </button>
            ) : null}
            <Link className={styles["brand-link"]} href={brandHref}>
              <span className={styles["brand-icon-shell"]} aria-hidden="true">
                <span className={styles["brand-icon"]} />
              </span>
              <span className={styles["brand-label"]}>Sunqar</span>
            </Link>
          </div>
        ) : null}
        <div className={styles["header-actions"]}>
          <TaskNotifications tasks={tasks} />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
