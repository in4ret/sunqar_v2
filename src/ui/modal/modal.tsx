"use client";

import { type ReactNode, useEffect, useId } from "react";

import styles from "./modal.module.scss";

export type ModalProps = {
  children: ReactNode;
  closeLabel?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

export function Modal({
  children,
  closeLabel = "Close",
  footer,
  isOpen,
  onClose,
  title,
}: ModalProps) {
  const titleId = useId();

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
        className={styles["modal"]}
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
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className={styles["modal-body"]}>{children}</div>
        {footer ? <div className={styles["modal-footer"]}>{footer}</div> : null}
      </section>
    </div>
  );
}
