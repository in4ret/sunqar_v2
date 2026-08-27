"use client";

import { useTranslations } from "next-intl";

import { MoonIcon, SunIcon } from "@/ui";

import { useTheme } from "../theme-provider/theme-provider";

import styles from "./theme-switcher.module.scss";

export function ThemeSwitcher() {
  const t = useTranslations();
  const { setTheme, theme } = useTheme();

  const nextTheme = theme === "light" ? "dark" : "light";
  const label = t(`header.theme.switch-to-${nextTheme}`);

  return (
    <button
      aria-label={label}
      className={styles["theme-switcher"]}
      type="button"
      onClick={() => {
        setTheme(nextTheme);
      }}
    >
      {nextTheme === "dark" ? (
        <MoonIcon className={styles["theme-switcher-icon"]} />
      ) : (
        <SunIcon className={styles["theme-switcher-icon"]} />
      )}
    </button>
  );
}
