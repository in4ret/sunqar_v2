"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import menuIcon from "./menu.svg";
import styles from "./mobile-navigation.module.scss";

type MobileNavigationItem = {
  href: string;
  label: string;
};

type MobileNavigationProps = {
  closeLabel: string;
  items: MobileNavigationItem[];
  menuLabel: string;
  navigationLabel: string;
  openLabel: string;
};

export function MobileNavigation({
  closeLabel,
  items,
  menuLabel,
  navigationLabel,
  openLabel,
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
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (items.length === 0) {
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
      {isOpen ? (
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
              <span className={styles["drawer-title"]}>{menuLabel}</span>
              <button
                aria-label={closeLabel}
                className={styles["close-button"]}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span className={styles["close-icon"]} aria-hidden="true" />
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
          </aside>
        </div>
      ) : null}
    </div>
  );
}
