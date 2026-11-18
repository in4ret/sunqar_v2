import { normalizeSearchQuery } from "@/lib/utils/normalize-search-query";

const STORAGE_KEY = "sunqar-semantic-search-state";

export function getStoredSemanticSearchQuery() {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    const value: unknown = rawValue ? JSON.parse(rawValue) : null;

    if (value && typeof value === "object" && "searchQuery" in value && typeof value.searchQuery === "string") {
      return normalizeSearchQuery(value.searchQuery);
    }
  } catch {
    // Search remains available when browser storage is unavailable or invalid.
  }

  return "";
}

export function setStoredSemanticSearchQuery(searchQuery: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ searchQuery }));
  } catch {
    // Persistence is optional; a storage failure must not prevent a search.
  }
}
