import { routes } from "@/lib/routes";

export function isInternalTaskNavigationUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const parsedUrl = new URL(value, "http://sunqar.local");

    return parsedUrl.pathname.startsWith(routes.comments);
  } catch {
    return false;
  }
}
