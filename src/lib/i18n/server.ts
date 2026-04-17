import { cookies, headers } from "next/headers";
import { isLocale, localeCookieName, type AppLocale } from "./shared";

function matchLocale(value: string): AppLocale | null {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue.startsWith("kk") || normalizedValue.startsWith("kz")) {
    return "kk";
  }

  if (normalizedValue.startsWith("ru")) {
    return "ru";
  }

  return null;
}

export async function resolveRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;

  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const requestHeaders = await headers();
  const acceptLanguage = requestHeaders.get("accept-language");

  if (acceptLanguage) {
    for (const part of acceptLanguage.split(",")) {
      const matchedLocale = matchLocale(part.split(";")[0] ?? "");

      if (matchedLocale) {
        return matchedLocale;
      }
    }
  }

  return "ru";
}
