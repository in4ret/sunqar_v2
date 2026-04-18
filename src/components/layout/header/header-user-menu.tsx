"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./header-user-menu.module.scss";

type HeaderUserMenuProps = {
  displayName: string;
  isAdmin: boolean;
  login: string;
  logoutAction: () => Promise<void>;
  logoutLabel: string;
  roleLabel: string;
};

export function HeaderUserMenu({
  displayName,
  isAdmin,
  login,
  logoutAction,
  logoutLabel,
  roleLabel,
}: HeaderUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={styles["user-menu"]} ref={rootRef}>
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`${styles["user-trigger"]} ${isAdmin ? styles["user-trigger-admin"] : ""}`}
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className={styles["trigger-login"]}>{login}</span>
        <span className={styles["trigger-icon"]} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className={styles["user-panel"]} id={menuId}>
          <div className={styles["user-details"]}>
            <span className={styles["display-name"]}>{displayName}</span>
            <span className={styles["role-label"]}>{roleLabel}</span>
          </div>
          <form action={logoutAction}>
            <button className={styles["logout-button"]} type="submit">
              {logoutLabel}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
