import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";

import type { AppLocale } from "@/lib/i18n/shared";
import {
  ClientIntlProvider,
  NavigationHistoryProvider,
} from "@/lib/providers";
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

  return (
    <html lang={locale}>
      <body>
        <ClientIntlProvider initialLocale={locale} initialMessages={messages}>
          <NavigationHistoryProvider>
            <ToastProvider>{children}</ToastProvider>
          </NavigationHistoryProvider>
        </ClientIntlProvider>
      </body>
    </html>
  );
}
