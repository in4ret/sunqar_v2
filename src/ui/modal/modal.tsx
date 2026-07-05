"use client";

import { type ReactNode, useEffect, useId } from "react";

import { XIcon } from "../icon/icon";

import styles from "./modal.module.scss";

export type ModalProps = {
  children: ReactNode;
  closeLabel?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: "default" | "wide";
  title: string;
};

export function Modal({
  children,
  closeLabel = "Close",
  footer,
  isOpen,
  onClose,
  size = "default",
  title,
}: ModalProps) {
  const titleId = useId();
  const modalClassName = [styles["modal"], size === "wide" ? styles["modal-wide"] : ""]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles["modal-overlay"]}
      role="presentation"
      onClick={() => {
        onClose();
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={modalClassName}
        role="dialog"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className={styles["modal-header"]}>
          <h2 className={styles["modal-title"]} id={titleId}>
            {title}
          </h2>
          <button
            aria-label={closeLabel}
            className={styles["modal-close-button"]}
            type="button"
            onClick={() => {
              onClose();
            }}
          >
            <XIcon className={styles["modal-close-icon"]} />
          </button>
        </div>
        <div className={styles["modal-body"]}>{children}</div>
        {footer ? <div className={styles["modal-footer"]}>{footer}</div> : null}
      </section>
    </div>
  );
}
