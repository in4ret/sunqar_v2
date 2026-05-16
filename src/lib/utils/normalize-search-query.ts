export function normalizeSearchQuery(value: string) {
  return value.trim().replaceAll(/\s+/g, " ");
}

export function normalizeSearchQueryParam(searchParam: string | string[] | undefined) {
  const value = typeof searchParam === "string" ? searchParam : searchParam?.[0] ?? "";

  return normalizeSearchQuery(value);
}
