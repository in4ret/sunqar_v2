import type { CommentsTab } from "@/lib/routes";
import { getCommentsTabRoute } from "@/lib/routes";

export type CreateCommentsTextTaskContentIdsImportStateInput = {
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
  selectedPosts: string[];
};

export type ShouldLoadCommentsPageDataInput = {
  isImportingTaskContentIdsSearchParam: boolean;
  isSearchReady: boolean;
  storedSelectedPosts: string[] | null;
};

export function shouldImportCommentsTextTaskContentIds(
  activeTab: CommentsTab,
  hasTaskContentIdsSearchParam: boolean,
) {
  return activeTab === "text" && hasTaskContentIdsSearchParam;
}

export function buildCommentsTextTaskContentIdsResolvedHref(input: {
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
}) {
  const nextUrl = new URL(getCommentsTabRoute("text"), "http://sunqar.local");

  if (input.searchFrom) {
    nextUrl.searchParams.set("from", input.searchFrom);
  }

  if (input.searchQuery) {
    nextUrl.searchParams.set("q", input.searchQuery);
  }

  if (input.searchTo) {
    nextUrl.searchParams.set("to", input.searchTo);
  }

  return `${nextUrl.pathname}${nextUrl.search}`;
}

export function createCommentsTextTaskContentIdsImportState(
  input: CreateCommentsTextTaskContentIdsImportStateInput,
) {
  return {
    href: buildCommentsTextTaskContentIdsResolvedHref({
      searchFrom: input.searchFrom,
      searchQuery: input.searchQuery,
      searchTo: input.searchTo,
    }),
    posts: input.selectedPosts,
    searchState: {
      searchQuery: input.searchQuery,
      selectedPosts: input.selectedPosts,
    },
  };
}

export function shouldLoadCommentsPageData(input: ShouldLoadCommentsPageDataInput) {
  if (!input.isSearchReady || input.isImportingTaskContentIdsSearchParam) {
    return false;
  }

  return input.storedSelectedPosts !== null;
}
