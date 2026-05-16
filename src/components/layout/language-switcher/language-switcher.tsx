"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";

import { type AppLocale, locales } from "@/lib/i18n/shared";
import { useClientLocale } from "@/lib/providers";

import styles from "./language-switcher.module.scss";

const localeLabels: Record<AppLocale, string> = {
  ru: "RU",
  kk: "KZ",
};

const focusLocaleStorageKey = "sunqar-focus-locale";

export function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const { isSwitchingLocale, setLocale } = useClientLocale();
  const t = useTranslations();
  const buttonRefs = useRef<Record<AppLocale, HTMLButtonElement | null>>({
    ru: null,
    kk: null,
  });
  const label = t("common.language");

  useEffect(() => {
    const focusLocale = sessionStorage.getItem(focusLocaleStorageKey);

    if (!isLocaleForFocus(focusLocale)) {
      return;
    }

    sessionStorage.removeItem(focusLocaleStorageKey);
    buttonRefs.current[focusLocale]?.focus();
  }, [locale]);

  function handleLocaleChange(nextLocale: AppLocale) {
    if (isSwitchingLocale) {
      return;
    }

    if (nextLocale === locale) {
      return;
    }

    sessionStorage.setItem(focusLocaleStorageKey, nextLocale);
    void setLocale(nextLocale);
  }

  return (
    <div className={styles["language-switcher"]} role="group" aria-label={label}>
      {locales.map((availableLocale) => (
        <button
          key={availableLocale}
          aria-label={t(`common.languages.${availableLocale}`)}
          aria-pressed={availableLocale === locale}
          aria-disabled={isSwitchingLocale}
          className={styles["language-option"]}
          data-active={availableLocale === locale ? "true" : undefined}
          ref={(button) => {
            buttonRefs.current[availableLocale] = button;
          }}
          type="button"
          onClick={() => handleLocaleChange(availableLocale)}
        >
          {localeLabels[availableLocale]}
        </button>
      ))}
    </div>
  );
}

function isLocaleForFocus(value: string | null): value is AppLocale {
  return locales.includes(value as AppLocale);
}
