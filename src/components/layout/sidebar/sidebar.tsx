"use client";

import { type MouseEvent as ReactMouseEvent, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MOBILE_MEDIA_QUERY } from "@/lib/mobile-breakpoint";
import { routes } from "@/lib/routes";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogOutIcon,
  UserRoundCogIcon,
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
  collapseSectionLabel: string;
  expandSectionLabel: string;
  navigationLabel: string;
  openLabel: string;
  sections: SidebarSection[];
  user: SidebarUser;
};

export function Sidebar({
  brandHref = routes.home,
  closeLabel,
  collapseSectionLabel,
  expandSectionLabel,
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
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

    function handleViewportChange(event: MediaQueryListEvent) {
      if (event.matches || !isOpen) {
        return;
      }

      closeDrawer();
    }

    mediaQuery.addEventListener("change", handleViewportChange);

    return () => {
      mediaQuery.removeEventListener("change", handleViewportChange);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleToggleRequest() {
      if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
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
          collapseSectionLabel={collapseSectionLabel}
          expandSectionLabel={expandSectionLabel}
          isSidebarCollapsed={isCollapsed}
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
              collapseSectionLabel={collapseSectionLabel}
              expandSectionLabel={expandSectionLabel}
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
const LAST_COMMENTS_TAB_STORAGE_KEY = "sunqar:last-comments-tab";
const LAST_COMMENTS_TAB_STORAGE_EVENT = "sunqar:last-comments-tab-change";
const LAST_NEWS_TAB_STORAGE_KEY = "sunqar:last-news-tab";
const LAST_NEWS_TAB_STORAGE_EVENT = "sunqar:last-news-tab-change";
const COMMENTS_TAB_HREFS: ReadonlySet<string> = new Set([
  routes.commentsChart,
  routes.commentsText,
  routes.commentsUpload,
]);
const NEWS_TAB_HREFS: ReadonlySet<string> = new Set([routes.newsChart, routes.newsText]);

function getStoredLastCommentsTabHref() {
  if (typeof window === "undefined") {
    return routes.commentsChart;
  }

  const storedValue = window.localStorage.getItem(LAST_COMMENTS_TAB_STORAGE_KEY);

  if (storedValue === "text") {
    return routes.commentsText;
  }

  if (storedValue === "upload") {
    return routes.commentsUpload;
  }

  return routes.commentsChart;
}

function subscribeToLastCommentsTab(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LAST_COMMENTS_TAB_STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LAST_COMMENTS_TAB_STORAGE_EVENT, callback);
  };
}

function setStoredLastCommentsTab(tab: "chart" | "text" | "upload") {
  window.localStorage.setItem(LAST_COMMENTS_TAB_STORAGE_KEY, tab);
  window.dispatchEvent(new CustomEvent(LAST_COMMENTS_TAB_STORAGE_EVENT));
}

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
  collapseSectionLabel: string;
  expandSectionLabel: string;
  isSidebarCollapsed?: boolean;
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
  collapseSectionLabel,
  expandSectionLabel,
  isSidebarCollapsed = false,
  navigationLabel,
  onNavigate,
  pathname,
  sections,
  showBrand = true,
  toggleButton,
  user,
}: SidebarContentProps) {
  const lastCommentsTabHref = useSyncExternalStore(
    subscribeToLastCommentsTab,
    getStoredLastCommentsTabHref,
    () => routes.commentsChart,
  );
  const lastNewsTabHref = useSyncExternalStore(
    subscribeToLastNewsTab,
    getStoredLastNewsTabHref,
    () => routes.newsChart,
  );

  useEffect(() => {
    if (pathname === routes.commentsChart) {
      setStoredLastCommentsTab("chart");
      return;
    }

    if (pathname === routes.commentsText) {
      setStoredLastCommentsTab("text");
      return;
    }

    if (pathname === routes.commentsUpload) {
      setStoredLastCommentsTab("upload");
      return;
    }

    if (pathname === routes.newsChart) {
      setStoredLastNewsTab("chart");
      return;
    }

    if (pathname === routes.newsText) {
      setStoredLastNewsTab("text");
    }
  }, [pathname]);

  function getItemHref(item: SidebarItem) {
    if (item.href === routes.comments) {
      return lastCommentsTabHref;
    }

    if (item.href === routes.news) {
      return lastNewsTabHref;
    }

    return item.href;
  }

  function getIsItemActive(item: SidebarItem) {
    if (
      item.href === routes.comments &&
      (pathname === routes.comments || COMMENTS_TAB_HREFS.has(pathname))
    ) {
      return true;
    }

    if (item.href === routes.news && (pathname === routes.news || NEWS_TAB_HREFS.has(pathname))) {
      return true;
    }

    return pathname === item.href || Boolean(item.children?.some((childItem) => pathname === childItem.href));
  }

  function getHasActiveChild(item: SidebarItem) {
    return Boolean(item.children?.some((childItem) => pathname === childItem.href));
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
                    return (
                      <SidebarNavItem
                        collapseSectionLabel={collapseSectionLabel}
                        expandSectionLabel={expandSectionLabel}
                        getHasActiveChild={getHasActiveChild}
                        getIsItemActive={getIsItemActive}
                        getItemHref={getItemHref}
                        isSidebarCollapsed={isSidebarCollapsed}
                        item={item}
                        key={`${item.href}:${pathname}`}
                        onNavigate={onNavigate}
                        pathname={pathname}
                      />
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

function SidebarNavItem({
  collapseSectionLabel,
  expandSectionLabel,
  getHasActiveChild,
  getIsItemActive,
  getItemHref,
  isSidebarCollapsed = false,
  item,
  onNavigate,
  pathname,
}: {
  collapseSectionLabel: string;
  expandSectionLabel: string;
  getHasActiveChild: (item: SidebarItem) => boolean;
  getIsItemActive: (item: SidebarItem) => boolean;
  getItemHref: (item: SidebarItem) => string;
  isSidebarCollapsed?: boolean;
  item: SidebarItem;
  onNavigate?: () => void;
  pathname: string;
}) {
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const shouldRenderAsExpandableItem = hasChildren && !isSidebarCollapsed;
  const hasActiveChild = getHasActiveChild(item);
  const [isExpanded, setIsExpanded] = useState(hasActiveChild);
  const subListId = useId();
  const isActive = getIsItemActive(item);
  const Icon = item.icon;

  return (
    <li className={styles["nav-item"]}>
      {shouldRenderAsExpandableItem ? (
        <div
          className={styles["nav-link-shell"]}
          data-active={isActive ? "true" : undefined}
        >
          <Link
            aria-current={pathname === item.href ? "page" : undefined}
            className={styles["nav-link"]}
            href={getItemHref(item)}
            onClick={onNavigate}
          >
            <Icon className={styles["nav-icon"]} />
            <span className={styles["nav-label"]}>{item.label}</span>
          </Link>
          <button
            aria-controls={subListId}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? collapseSectionLabel : expandSectionLabel}
            className={styles["nav-toggle-button"]}
            type="button"
            onClick={() => {
              setIsExpanded((currentValue) => !currentValue);
            }}
          >
            <ChevronDownIcon
              className={styles["nav-toggle-icon"]}
              data-expanded={isExpanded ? "true" : undefined}
            />
          </button>
        </div>
      ) : (
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
      )}
      {shouldRenderAsExpandableItem ? (
        <ul
          className={styles["nav-sub-list"]}
          data-expanded={isExpanded ? "true" : "false"}
          id={subListId}
          hidden={!isExpanded}
        >
          {item.children?.map((childItem) => {
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
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useId();
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (shellRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  function closePanel() {
    setIsOpen(false);
  }

  function handleTriggerClick() {
    setIsOpen((currentValue) => !currentValue);
  }

  function handleContentClick(event: ReactMouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <div className={styles["user-menu-shell"]} ref={shellRef}>
      <button
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={user.displayName}
        className={`${styles["user-menu-trigger"]} ${user.isAdmin ? styles["user-menu-trigger-admin"] : ""}`}
        type="button"
        onClick={handleTriggerClick}
      >
        <UserRoundCogIcon className={styles["user-menu-trigger-icon"]} />
        <span className={styles["user-menu-trigger-label"]}>{user.displayName}</span>
      </button>
      <div
        aria-label={user.displayName}
        className={`${styles["user-panel"]} ${user.isAdmin ? styles["user-panel-admin"] : ""}`}
        id={popoverId}
        role="dialog"
        data-open={isOpen ? "true" : "false"}
        onClick={handleContentClick}
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
            onClick={() => {
              closePanel();
              onNavigate?.();
            }}
          >
            <UserRoundIcon className={styles["user-action-icon"]} />
            <span className={styles["account-label"]}>{user.accountLabel}</span>
          </Link>
          <form action={user.logoutAction}>
            <button
              aria-label={user.logoutLabel}
              className={styles["logout-button"]}
              type="submit"
              onClick={closePanel}
            >
              <LogOutIcon className={styles["user-action-icon"]} />
              <span className={styles["logout-label"]}>{user.logoutLabel}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
