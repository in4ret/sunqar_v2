"use client";

import {
  createContext,
  type RefObject,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type RouteEntry = {
  href: string;
  pathname: string;
  search: string;
};

type NavigationHistoryState = {
  current: RouteEntry | null;
  previous: RouteEntry | null;
};

type BackToPreviousPathnameOrReplaceOptions = {
  fallbackHref: string;
  pathname: string;
  refreshOnArrival?: boolean;
};

type NavigationHistoryContextValue = {
  backToPreviousPathnameOrReplace: (
    options: BackToPreviousPathnameOrReplaceOptions,
  ) => void;
};

type NavigationRouter = ReturnType<typeof useRouter>;

const navigationHistoryContext =
  createContext<NavigationHistoryContextValue | null>(null);
const historyStateKey = "__sunqarNavigationHistory";
const pendingRefreshPathnameKey =
  "sunqar:navigation-history:pending-refresh-pathname";

function createRouteEntry(pathname: string, search: string): RouteEntry {
  return {
    href: `${pathname}${search}`,
    pathname,
    search,
  };
}

function createRouteEntryFromQueryString(pathname: string, queryString: string) {
  return createRouteEntry(pathname, queryString ? `?${queryString}` : "");
}

function isRouteEntry(value: unknown): value is RouteEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const routeEntry = value as Partial<RouteEntry>;

  return (
    typeof routeEntry.href === "string" &&
    typeof routeEntry.pathname === "string" &&
    typeof routeEntry.search === "string"
  );
}

function readStoredNavigationHistory(): NavigationHistoryState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const historyState = window.history.state;

  if (!historyState || typeof historyState !== "object") {
    return null;
  }

  const storedHistory = (historyState as Record<string, unknown>)[historyStateKey];

  if (!storedHistory || typeof storedHistory !== "object") {
    return null;
  }

  const candidate = storedHistory as Partial<NavigationHistoryState>;
  const current = isRouteEntry(candidate.current) ? candidate.current : null;
  const previous = isRouteEntry(candidate.previous) ? candidate.previous : null;

  return {
    current,
    previous,
  };
}

function resolvePreviousEntry(
  storedHistory: NavigationHistoryState | null,
  currentEntry: RouteEntry,
) {
  if (!storedHistory) {
    return null;
  }

  if (storedHistory.current?.href === currentEntry.href) {
    return storedHistory.previous;
  }

  if (storedHistory.current && storedHistory.current.pathname !== currentEntry.pathname) {
    return storedHistory.current;
  }

  return storedHistory.previous;
}

function writeStoredNavigationHistory(navigationHistory: NavigationHistoryState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const historyState = window.history.state;
    const nextHistoryState =
      historyState && typeof historyState === "object" && !Array.isArray(historyState)
        ? {
            ...historyState,
            [historyStateKey]: navigationHistory,
          }
        : {
            [historyStateKey]: navigationHistory,
          };

    window.history.replaceState(nextHistoryState, "", window.location.href);
  } catch {
    return;
  }
}

function readPendingRefreshPathname() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(pendingRefreshPathnameKey);
  } catch {
    return null;
  }
}

function writePendingRefreshPathname(pathname: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(pendingRefreshPathnameKey, pathname);
  } catch {
    return;
  }
}

function clearPendingRefreshPathname() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(pendingRefreshPathnameKey);
  } catch {
    return;
  }
}

function getPathnameFromHref(href: string) {
  if (typeof window === "undefined") {
    return href.split("?")[0]?.split("#")[0] ?? href;
  }

  try {
    return new URL(href, window.location.origin).pathname;
  } catch {
    return href.split("?")[0]?.split("#")[0] ?? href;
  }
}

function getPreviousEntry(navigationHistory: NavigationHistoryState) {
  if (navigationHistory.previous) {
    return navigationHistory.previous;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const currentEntry = createRouteEntry(
    window.location.pathname,
    window.location.search,
  );

  return resolvePreviousEntry(readStoredNavigationHistory(), currentEntry);
}

type NavigationHistoryTrackerProps = {
  historyRef: RefObject<NavigationHistoryState>;
  router: NavigationRouter;
};

function NavigationHistoryTracker({
  historyRef,
  router,
}: NavigationHistoryTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    const nextCurrent = createRouteEntryFromQueryString(pathname, search);
    const currentHistory = historyRef.current;
    let nextPrevious = currentHistory.previous;

    if (currentHistory.current && currentHistory.current.href !== nextCurrent.href) {
      nextPrevious = currentHistory.current;
    }

    if (!currentHistory.current) {
      nextPrevious = resolvePreviousEntry(readStoredNavigationHistory(), nextCurrent);
    }

    historyRef.current = {
      current: nextCurrent,
      previous: nextPrevious,
    };
    writeStoredNavigationHistory(historyRef.current);

    if (readPendingRefreshPathname() === pathname) {
      clearPendingRefreshPathname();
      router.refresh();
    }
  }, [historyRef, pathname, router, search]);

  return null;
}

type NavigationHistoryProviderProps = {
  children: React.ReactNode;
};

export function NavigationHistoryProvider({
  children,
}: NavigationHistoryProviderProps) {
  const router = useRouter();
  const historyRef = useRef<NavigationHistoryState>({
    current: null,
    previous: null,
  });

  const backToPreviousPathnameOrReplace = useCallback(
    ({
      fallbackHref,
      pathname,
      refreshOnArrival = false,
    }: BackToPreviousPathnameOrReplaceOptions) => {
      const previousEntry = getPreviousEntry(historyRef.current);

      if (previousEntry?.pathname === pathname) {
        if (refreshOnArrival) {
          writePendingRefreshPathname(pathname);
        }

        router.back();
        return;
      }

      if (refreshOnArrival) {
        writePendingRefreshPathname(getPathnameFromHref(fallbackHref));
      }

      router.replace(fallbackHref);
    },
    [router],
  );

  return (
    <navigationHistoryContext.Provider value={{ backToPreviousPathnameOrReplace }}>
      <Suspense fallback={null}>
        <NavigationHistoryTracker historyRef={historyRef} router={router} />
      </Suspense>
      {children}
    </navigationHistoryContext.Provider>
  );
}

export function useNavigationHistory() {
  const context = useContext(navigationHistoryContext);

  if (!context) {
    throw new Error("useNavigationHistory must be used within NavigationHistoryProvider");
  }

  return context;
}
