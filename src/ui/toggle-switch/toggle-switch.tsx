"use client";

import styles from "./toggle-switch.module.scss";

type ToggleSwitchProps = {
  "aria-label": string;
  checked: boolean;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
};

export function ToggleSwitch({
  "aria-label": ariaLabel,
  checked,
  className,
  disabled = false,
  onClick,
}: ToggleSwitchProps) {
  const classNames = [styles["toggle-switch"], className].filter(Boolean).join(" ");

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={checked}
      className={classNames}
      data-active={checked ? "true" : "false"}
      disabled={disabled}
      type="submit"
      onClick={onClick}
    >
      <span className={styles["toggle-track"]}>
        <span className={styles["toggle-thumb"]} />
      </span>
    </button>
  );
}
