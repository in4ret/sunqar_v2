import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { NavigationHistoryProvider } from "@/lib/providers";
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
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <NavigationHistoryProvider>
            <ToastProvider>{children}</ToastProvider>
          </NavigationHistoryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
