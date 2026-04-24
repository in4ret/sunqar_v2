"use client";

import { type CSSProperties } from "react";
import styles from "./toast.module.scss";

export type ToastStatus = "success" | "warning" | "error";

export type ToastProps = {
  duration?: number;
  message: string;
  onDismiss?: () => void;
  status: ToastStatus;
};

export function Toast({
  duration = 3000,
  message,
  onDismiss,
  status,
}: ToastProps) {
  const style = { "--toast-duration": `${duration}ms` } as CSSProperties;

  return (
    <div
      aria-live={status === "error" ? "assertive" : "polite"}
      className={[
        styles["toast"],
        styles[`toast-${status}`],
      ].join(" ")}
      onAnimationEnd={() => {
        onDismiss?.();
      }}
      role={status === "error" ? "alert" : "status"}
      style={style}
    >
      <span aria-hidden="true" className={styles["toast-marker"]} />
      <p className={styles["toast-message"]}>{message}</p>
    </div>
  );
}
