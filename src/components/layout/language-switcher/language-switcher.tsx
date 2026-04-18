"use client";

import { useEffect, useRef, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { localeCookieName, locales, type AppLocale } from "@/lib/i18n/shared";
import styles from "./language-switcher.module.scss";

const localeLabels: Record<AppLocale, string> = {
  ru: "RU",
  kk: "KZ",
};

const focusLocaleStorageKey = "sunqar-focus-locale";

function setLocaleCookie(nextLocale: AppLocale) {
  document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
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
    if (isPending) {
      return;
    }

    if (nextLocale === locale) {
      return;
    }

    sessionStorage.setItem(focusLocaleStorageKey, nextLocale);
    setLocaleCookie(nextLocale);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className={styles["language-switcher"]} role="group" aria-label={label}>
      {locales.map((availableLocale) => (
        <button
          key={availableLocale}
          aria-label={t(`common.languages.${availableLocale}`)}
          aria-pressed={availableLocale === locale}
          aria-disabled={isPending}
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
