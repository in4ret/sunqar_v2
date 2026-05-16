"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  type AbstractIntlMessages,
  NextIntlClientProvider,
} from "next-intl";

import {
  type AppLocale,
  isLocale,
  localeCookieName,
} from "@/lib/i18n/shared";

type ClientIntlProviderProps = {
  children: React.ReactNode;
  initialLocale: AppLocale;
  initialMessages: AbstractIntlMessages;
};

type ClientLocaleContextValue = {
  isSwitchingLocale: boolean;
  locale: AppLocale;
  setLocale: (nextLocale: AppLocale) => Promise<void>;
};

const clientLocaleContext = createContext<ClientLocaleContextValue | null>(null);

async function loadLocaleMessages(locale: AppLocale): Promise<AbstractIntlMessages> {
  if (locale === "kk") {
    return (await import("../../../../messages/kk.json")).default;
  }

  return (await import("../../../../messages/ru.json")).default;
}

function setLocaleCookie(locale: AppLocale) {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function ClientIntlProvider({
  children,
  initialLocale,
  initialMessages,
}: ClientIntlProviderProps) {
  const [locale, setLocale] = useState<AppLocale>(initialLocale);
  const [messages, setMessages] = useState<AbstractIntlMessages>(initialMessages);
  const [isSwitchingLocale, startTransition] = useTransition();
  const requestIdRef = useRef(0);

  async function handleSetLocale(nextLocale: AppLocale) {
    if (!isLocale(nextLocale) || nextLocale === locale) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const nextMessages = await loadLocaleMessages(nextLocale);

    if (requestIdRef.current !== requestId) {
      return;
    }

    startTransition(() => {
      setLocale(nextLocale);
      setMessages(nextMessages);
    });
    setLocaleCookie(nextLocale);
  }

  return (
    <clientLocaleContext.Provider
      value={{
        isSwitchingLocale,
        locale,
        setLocale: handleSetLocale,
      }}
    >
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </clientLocaleContext.Provider>
  );
}

export function useClientLocale() {
  const context = useContext(clientLocaleContext);

  if (!context) {
    throw new Error("useClientLocale must be used within ClientIntlProvider");
  }

  return context;
}
