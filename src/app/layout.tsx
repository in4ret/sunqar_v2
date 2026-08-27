import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocale, getMessages } from "next-intl/server";

import { ThemeProvider } from "@/components/layout";
import type { AppLocale } from "@/lib/i18n/shared";
import {
  ClientIntlProvider,
  NavigationHistoryProvider,
} from "@/lib/providers";
import { isTheme, THEME_COOKIE_NAME } from "@/lib/theme/theme-preference";
import { ToastProvider } from "@/ui/toast/toast-provider";

import "@/styles/globals.scss";

export const metadata: Metadata = {
  title: "Sunqar",
  description: "Protected application shell",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = (await getLocale()) as AppLocale;
  const messages = await getMessages();
  const cookieStore = await cookies();
  const storedTheme = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const theme = isTheme(storedTheme) ? storedTheme : undefined;

  return (
    <html data-theme={theme} lang={locale}>
      <body>
        <ClientIntlProvider initialLocale={locale} initialMessages={messages}>
          <ThemeProvider initialTheme={theme}>
            <NavigationHistoryProvider>
              <ToastProvider>{children}</ToastProvider>
            </NavigationHistoryProvider>
          </ThemeProvider>
        </ClientIntlProvider>
      </body>
    </html>
  );
}
