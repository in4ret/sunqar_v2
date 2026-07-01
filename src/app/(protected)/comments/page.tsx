import { redirect } from "next/navigation";

import { getCommentsTabRoute } from "@/lib/routes";
import {
  normalizeEpochSecondsParam,
  normalizeSearchQueryParam,
} from "@/lib/utils";

type CommentsPageSearchParams = Promise<{
  from?: string | string[];
  q?: string | string[];
  to?: string | string[];
}>;

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: CommentsPageSearchParams;
}) {
  const { from, q, to } = await searchParams;
  const searchFrom = normalizeEpochSecondsParam(from);
  const searchQuery = normalizeSearchQueryParam(q);
  const searchTo = normalizeEpochSecondsParam(to);
  const nextUrl = new URL(getCommentsTabRoute("chart"), "http://sunqar.local");

  if (searchFrom) {
    nextUrl.searchParams.set("from", searchFrom);
  }

  if (searchQuery) {
    nextUrl.searchParams.set("q", searchQuery);
  }

  if (searchTo) {
    nextUrl.searchParams.set("to", searchTo);
  }

  redirect(`${nextUrl.pathname}${nextUrl.search}`);
}
