export const THEME_COOKIE_NAME = "sunqar-theme";

export const themeValues = ["light", "dark"] as const;

export type Theme = (typeof themeValues)[number];

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

export function resolveTheme(
  storedTheme: string | null,
  prefersDark: boolean,
): Theme {
  if (isTheme(storedTheme)) {
    return storedTheme;
  }

  return prefersDark ? "dark" : "light";
}
