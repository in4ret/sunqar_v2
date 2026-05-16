import { getRequestConfig } from "next-intl/server";

import { resolveRequestLocale } from "@/lib/i18n/server";
import { defaultTimeZone } from "@/lib/i18n/shared";

export default getRequestConfig(async () => {
  const locale = await resolveRequestLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: defaultTimeZone,
  };
});
