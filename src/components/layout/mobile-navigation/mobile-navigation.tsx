"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import menuIcon from "./menu.svg";
import styles from "./mobile-navigation.module.scss";

type MobileNavigationItem = {
  href: string;
  label: string;
};

type MobileNavigationUser = {
  displayName: string;
  isAdmin: boolean;
  login: string;
  logoutAction: () => Promise<void>;
  logoutLabel: string;
  roleLabel: string;
};

type MobileNavigationProps = {
  closeLabel: string;
  items: MobileNavigationItem[];
  navigationLabel: string;
  openLabel: string;
  user?: MobileNavigationUser;
};

export function MobileNavigation({
  closeLabel,
  items,
  navigationLabel,
  openLabel,
  user,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const drawerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (items.length === 0 && !user) {
    return null;
  }

  return (
    <div className={styles["mobile-navigation"]}>
      <button
        aria-controls={isOpen ? drawerId : undefined}
        aria-expanded={isOpen}
        aria-label={isOpen ? closeLabel : openLabel}
        className={styles["menu-trigger"]}
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <Image
          alt=""
          aria-hidden="true"
          className={styles["trigger-icon"]}
          height={14}
          src={menuIcon}
          width={18}
        />
      </button>
      {isOpen
        ? createPortal(
            <div className={styles["drawer-layer"]}>
              <button
                aria-label={closeLabel}
                className={styles["drawer-backdrop"]}
                type="button"
                onClick={() => setIsOpen(false)}
              />
              <aside
                aria-label={navigationLabel}
                className={styles["drawer"]}
                id={drawerId}
              >
                <div className={styles["drawer-header"]}>
                  <span className={styles["brand"]}>
                    <span
                      className={styles["brand-icon-shell"]}
                      aria-hidden="true"
                    >
                      <span className={styles["brand-icon"]} />
                    </span>
                    <span className={styles["brand-label"]}>Sunqar</span>
                  </span>
                  <button
                    aria-label={closeLabel}
                    className={styles["close-button"]}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    <span
                      className={styles["close-icon"]}
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <nav aria-label={navigationLabel}>
                  <ul className={styles["drawer-list"]}>
                    {items.map((item) => (
                      <li key={item.href}>
                        <Link
                          className={styles["drawer-link"]}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                {user ? (
                  <div
                    className={`${styles["drawer-user"]} ${user.isAdmin ? styles["drawer-user-admin"] : ""}`}
                  >
                    <div className={styles["drawer-user-details"]}>
                      <span className={styles["drawer-user-name"]}>
                        {user.displayName}
                      </span>
                      <span className={styles["drawer-user-login"]}>
                        {user.login}
                      </span>
                      <span className={styles["drawer-user-role"]}>
                        {user.roleLabel}
                      </span>
                    </div>
                    <form action={user.logoutAction}>
                      <button
                        className={styles["logout-button"]}
                        type="submit"
                      >
                        {user.logoutLabel}
                      </button>
                    </form>
                  </div>
                ) : null}
              </aside>
            </div>,
          document.body,
        )
        : null}
    </div>
  );
}
