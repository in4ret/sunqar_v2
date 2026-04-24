"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  SIDEBAR_STATE_EVENT,
  SIDEBAR_TOGGLE_EVENT,
} from "./sidebar-events";
import styles from "./sidebar.module.scss";

type SidebarItem = {
  href: string;
  label: string;
};

type SidebarUser = {
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
  items: SidebarItem[];
  navigationLabel: string;
  openLabel: string;
  user: SidebarUser;
};

export function Sidebar({
  brandHref = "/",
  closeLabel,
  items,
  navigationLabel,
  openLabel,
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
          items={items}
          navigationLabel={navigationLabel}
          pathname={pathname}
          toggleButton={
            <button
              aria-label={isCollapsed ? openLabel : closeLabel}
              aria-pressed={isCollapsed}
              className={styles["collapse-button"]}
              type="button"
              onClick={handleCollapsedChange}
            >
              <span
                className={styles["collapse-icon"]}
                aria-hidden="true"
              />
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
                <span className={styles["close-icon"]} aria-hidden="true" />
              </button>
            </div>
            <SidebarContent
              brandHref={brandHref}
              items={items}
              navigationLabel={navigationLabel}
              pathname={pathname}
              user={user}
              onNavigate={closeDrawer}
              showBrand={false}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}

const DRAWER_ANIMATION_MS = 220;
const MOBILE_BREAKPOINT_PX = "768px";

type SidebarContentProps = {
  brandHref?: string;
  items: SidebarItem[];
  navigationLabel: string;
  onNavigate?: () => void;
  pathname: string;
  showBrand?: boolean;
  toggleButton?: React.ReactNode;
  user: SidebarUser;
};

function SidebarContent({
  brandHref = "/",
  items,
  navigationLabel,
  onNavigate,
  pathname,
  showBrand = true,
  toggleButton,
  user,
}: SidebarContentProps) {
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
          <ul className={styles["nav-list"]}>
            {items.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                  className={styles["nav-link"]}
                  data-active={isActive ? "true" : undefined}
                  href={item.href}
                  onClick={onNavigate}
                >
                  <span className={styles["nav-label"]}>{item.label}</span>
                </Link>
              </li>
            );
            })}
          </ul>
        </nav>
        <UserPanel user={user} />
      </div>
    </div>
  );
}

function Brand({
  href = "/",
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
  user,
}: {
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
      <form action={user.logoutAction}>
        <button
          aria-label={user.logoutLabel}
          className={styles["logout-button"]}
          type="submit"
        >
          <span className={styles["logout-label"]}>{user.logoutLabel}</span>
        </button>
      </form>
    </div>
  );
}
