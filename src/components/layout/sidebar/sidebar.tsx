"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/lib/routes";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LogOutIcon,
  UserRoundIcon,
  XIcon,
} from "@/ui";

import {
  SIDEBAR_STATE_EVENT,
  SIDEBAR_TOGGLE_EVENT,
} from "./sidebar-events";

import styles from "./sidebar.module.scss";


type SidebarItem = {
  children?: SidebarItem[];
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

type SidebarSection = {
  eyebrow?: string;
  items: SidebarItem[];
};

type SidebarUser = {
  accountHref: string;
  accountLabel: string;
  displayName: string;
  isAdmin: boolean;
  login: string;
  logoutAction: () => Promise<void>;
  logoutLabel: string;
  roleLabel: string;
};

type SidebarProps = {
  brandHref?: string;
  closeLabel: string;
  navigationLabel: string;
  openLabel: string;
  sections: SidebarSection[];
  user: SidebarUser;
};

export function Sidebar({
  brandHref = routes.home,
  closeLabel,
  navigationLabel,
  openLabel,
  sections,
  user,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const drawerId = useId();
  const pathname = usePathname();
  const closeTimeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openDrawer() {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsDrawerMounted(true);
    setIsOpen(true);
  }

  function closeDrawer() {
    setIsOpen(false);

    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      setIsDrawerMounted(false);
      closeTimeoutRef.current = null;
    }, DRAWER_ANIMATION_MS);
  }

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", isCollapsed);

    return () => {
      document.body.classList.remove("sidebar-collapsed");
    };
  }, [isCollapsed]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      closeDrawer();
      triggerRef.current?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleToggleRequest() {
      if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX})`).matches) {
        if (isOpen) {
          closeDrawer();
          return;
        }

        openDrawer();
        return;
      }

      setIsCollapsed((currentValue) => !currentValue);
    }

    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handleToggleRequest);

    return () => {
      window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handleToggleRequest);
    };
  }, [isOpen]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(SIDEBAR_STATE_EVENT, {
        detail: {
          isCollapsed,
          isOpen,
        },
      }),
    );
  }, [isCollapsed, isOpen]);

  function handleCollapsedChange() {
    setIsCollapsed((currentValue) => !currentValue);
  }

  return (
    <>
      <aside
        aria-label={navigationLabel}
        className={`${styles["sidebar"]} ${isCollapsed ? styles["sidebar-collapsed"] : ""}`}
      >
        <SidebarContent
          brandHref={brandHref}
          navigationLabel={navigationLabel}
          pathname={pathname}
          sections={sections}
          toggleButton={
            <button
              aria-label={isCollapsed ? openLabel : closeLabel}
              aria-pressed={isCollapsed}
              className={styles["collapse-button"]}
              type="button"
              onClick={handleCollapsedChange}
            >
              {isCollapsed ? (
                <ChevronRightIcon className={styles["collapse-icon"]} />
              ) : (
                <ChevronLeftIcon className={styles["collapse-icon"]} />
              )}
            </button>
          }
          user={user}
        />
      </aside>
      {isDrawerMounted ? (
        <div
          className={styles["drawer-layer"]}
          data-open={isOpen ? "true" : "false"}
        >
          <button
            aria-label={closeLabel}
            className={styles["drawer-backdrop"]}
            type="button"
            onClick={closeDrawer}
          />
          <aside
            aria-label={navigationLabel}
            className={styles["drawer"]}
            id={drawerId}
          >
            <div className={styles["brand-header"]}>
              <Brand href={brandHref} onNavigate={closeDrawer} />
              <button
                aria-label={closeLabel}
                className={styles["close-button"]}
                type="button"
                onClick={() => {
                  closeDrawer();
                  triggerRef.current?.focus();
                }}
              >
                <XIcon className={styles["close-icon"]} />
              </button>
            </div>
            <SidebarContent
              brandHref={brandHref}
              navigationLabel={navigationLabel}
              onNavigate={closeDrawer}
              pathname={pathname}
              sections={sections}
              user={user}
              showBrand={false}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}

const DRAWER_ANIMATION_MS = 220;
const LAST_NEWS_TAB_STORAGE_KEY = "sunqar:last-news-tab";
const LAST_NEWS_TAB_STORAGE_EVENT = "sunqar:last-news-tab-change";
const MOBILE_BREAKPOINT_PX = "768px";
const NEWS_TAB_HREFS = new Set([routes.newsChart, routes.newsText]);

function getStoredLastNewsTabHref() {
  if (typeof window === "undefined") {
    return routes.newsChart;
  }

  return window.localStorage.getItem(LAST_NEWS_TAB_STORAGE_KEY) === "text"
    ? routes.newsText
    : routes.newsChart;
}

function subscribeToLastNewsTab(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LAST_NEWS_TAB_STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LAST_NEWS_TAB_STORAGE_EVENT, callback);
  };
}

function setStoredLastNewsTab(tab: "chart" | "text") {
  window.localStorage.setItem(LAST_NEWS_TAB_STORAGE_KEY, tab);
  window.dispatchEvent(new CustomEvent(LAST_NEWS_TAB_STORAGE_EVENT));
}

type SidebarContentProps = {
  brandHref?: string;
  navigationLabel: string;
  onNavigate?: () => void;
  pathname: string;
  sections: SidebarSection[];
  showBrand?: boolean;
  toggleButton?: React.ReactNode;
  user: SidebarUser;
};

function SidebarContent({
  brandHref = routes.home,
  navigationLabel,
  onNavigate,
  pathname,
  sections,
  showBrand = true,
  toggleButton,
  user,
}: SidebarContentProps) {
  const lastNewsTabHref = useSyncExternalStore(
    subscribeToLastNewsTab,
    getStoredLastNewsTabHref,
    () => routes.newsChart,
  );

  useEffect(() => {
    if (pathname === routes.newsChart) {
      setStoredLastNewsTab("chart");
      return;
    }

    if (pathname === routes.newsText) {
      setStoredLastNewsTab("text");
    }
  }, [pathname]);

  function getItemHref(item: SidebarItem) {
    if (item.href === routes.news) {
      return lastNewsTabHref;
    }

    return item.href;
  }

  function getIsItemActive(item: SidebarItem) {
    if (item.href === routes.news && (pathname === routes.news || NEWS_TAB_HREFS.has(pathname))) {
      return true;
    }

    return pathname === item.href || Boolean(item.children?.some((childItem) => pathname === childItem.href));
  }

  return (
    <div className={styles["sidebar-content"]}>
      {showBrand ? (
        <div className={styles["brand-header"]}>
          <Brand href={brandHref} />
          {toggleButton}
        </div>
      ) : null}
      <div className={styles["sidebar-body"]}>
        <nav aria-label={navigationLabel} className={styles["navigation"]}>
          <div className={styles["nav-sections"]}>
            {sections.map((section, sectionIndex) => (
              <div
                className={styles["nav-section"]}
                key={section.eyebrow ?? `section-${sectionIndex}`}
              >
                {section.eyebrow ? (
                  <p className={styles["nav-section-eyebrow"]}>{section.eyebrow}</p>
                ) : null}
                <ul className={styles["nav-list"]}>
                  {section.items.map((item) => {
                    const isActive = getIsItemActive(item);
                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          aria-current={pathname === item.href ? "page" : undefined}
                          className={styles["nav-link"]}
                          data-active={isActive ? "true" : undefined}
                          href={getItemHref(item)}
                          onClick={onNavigate}
                        >
                          <Icon className={styles["nav-icon"]} />
                          <span className={styles["nav-label"]}>{item.label}</span>
                        </Link>
                        {item.children && item.children.length > 0 ? (
                          <ul className={styles["nav-sub-list"]}>
                            {item.children.map((childItem) => {
                              const isChildActive = pathname === childItem.href;
                              const ChildIcon = childItem.icon;

                              return (
                                <li key={childItem.href}>
                                  <Link
                                    aria-current={isChildActive ? "page" : undefined}
                                    className={styles["nav-sub-link"]}
                                    data-active={isChildActive ? "true" : undefined}
                                    href={childItem.href}
                                    onClick={onNavigate}
                                  >
                                    <ChildIcon className={styles["nav-sub-icon"]} />
                                    <span className={styles["nav-sub-label"]}>{childItem.label}</span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <UserPanel onNavigate={onNavigate} pathname={pathname} user={user} />
      </div>
    </div>
  );
}

function Brand({
  href = routes.home,
  onNavigate,
}: {
  href?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      className={styles["brand-link"]}
      href={href}
      onClick={onNavigate}
    >
      <span className={styles["brand-icon-shell"]} aria-hidden="true">
        <span className={styles["brand-icon"]} />
      </span>
      <span className={styles["brand-label"]}>Sunqar</span>
    </Link>
  );
}

function UserPanel({
  onNavigate,
  pathname,
  user,
}: {
  onNavigate?: () => void;
  pathname: string;
  user: SidebarUser;
}) {
  return (
    <div
      className={`${styles["user-panel"]} ${user.isAdmin ? styles["user-panel-admin"] : ""}`}
    >
      <div className={styles["user-details"]}>
        <span className={styles["user-name"]}>{user.displayName}</span>
        <span className={styles["user-login"]}>{user.login}</span>
        <span className={styles["user-role"]}>{user.roleLabel}</span>
      </div>
      <div className={styles["user-actions"]}>
        <Link
          aria-current={pathname === user.accountHref ? "page" : undefined}
          className={styles["account-link"]}
          data-active={pathname === user.accountHref ? "true" : undefined}
          href={user.accountHref}
          onClick={onNavigate}
        >
          <UserRoundIcon className={styles["user-action-icon"]} />
          <span className={styles["account-label"]}>{user.accountLabel}</span>
        </Link>
        <form action={user.logoutAction}>
          <button
            aria-label={user.logoutLabel}
            className={styles["logout-button"]}
            type="submit"
          >
            <LogOutIcon className={styles["user-action-icon"]} />
            <span className={styles["logout-label"]}>{user.logoutLabel}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
