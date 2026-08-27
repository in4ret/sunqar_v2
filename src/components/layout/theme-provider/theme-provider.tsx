"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  isTheme,
  resolveTheme,
  type Theme,
  THEME_COOKIE_NAME,
} from "@/lib/theme/theme-preference";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

type ThemeContextValue = {
  setTheme(theme: Theme): void;
  theme: Theme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  initialTheme?: Theme;
};

function getStoredTheme() {
  const themeCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${THEME_COOKIE_NAME}=`));

  return themeCookie?.slice(THEME_COOKIE_NAME.length + 1) ?? null;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function storeTheme(theme: Theme) {
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? "light");

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);

    function updateTheme() {
      const nextTheme = resolveTheme(getStoredTheme(), mediaQuery.matches);

      applyTheme(nextTheme);
      setThemeState(nextTheme);
    }

    function handleSystemThemeChange() {
      if (!isTheme(getStoredTheme())) {
        updateTheme();
      }
    }

    updateTheme();
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      setTheme(nextTheme) {
        storeTheme(nextTheme);
        applyTheme(nextTheme);
        setThemeState(nextTheme);
      },
      theme,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
