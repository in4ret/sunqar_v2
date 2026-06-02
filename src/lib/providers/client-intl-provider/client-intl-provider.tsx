"use client";

import {
  createContext,
  useContext,
  useEffect,
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
  defaultTimeZone,
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
const localeMessagesCache = new Map<AppLocale, Promise<AbstractIntlMessages>>();

async function loadLocaleMessages(locale: AppLocale): Promise<AbstractIntlMessages> {
  const cachedMessages = localeMessagesCache.get(locale);

  if (cachedMessages) {
    return cachedMessages;
  }

  const messagesPromise =
    locale === "kk"
      ? import("../../../../messages/kk.json").then((module) => module.default)
      : import("../../../../messages/ru.json").then((module) => module.default);

  localeMessagesCache.set(locale, messagesPromise);

  return messagesPromise;
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

  useEffect(() => {
    localeMessagesCache.set(locale, Promise.resolve(messages));

    const nextLocale: AppLocale = locale === "ru" ? "kk" : "ru";

    void loadLocaleMessages(nextLocale);
  }, [locale, messages]);

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
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone={defaultTimeZone}
      >
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
