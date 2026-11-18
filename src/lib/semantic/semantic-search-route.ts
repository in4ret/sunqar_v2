import { ONE_HOUR_REVALIDATE, swrCache } from "@/lib/cache";
import { formatLogMessage } from "@/lib/logs";
import { normalizeSearchQuery } from "@/lib/utils/normalize-search-query";

import { isSemanticSearchArticles, type SemanticSearchArticle } from "./semantic-search.types";

type SemanticSearchDependencies = {
  getCurrentUserImpl: () => Promise<unknown>;
  apiGatewayUrl: string | null;
  fetchImpl: typeof fetch;
};

function json(payload: object, status: number) {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export function createSemanticSearchGetHandler({
  getCurrentUserImpl,
  apiGatewayUrl,
  fetchImpl,
}: SemanticSearchDependencies) {
  const pendingRequests = new Map<string, Promise<SemanticSearchArticle[]>>();
  const getCachedArticles = swrCache(async (query: string) => {
    const pendingRequest = pendingRequests.get(query);

    if (pendingRequest) {
      return pendingRequest;
    }

    const loadArticles = async () => {
      if (!apiGatewayUrl) {
        throw new Error("API_GATEWAY_URL is not configured.");
      }

      const url = new URL("/semantic_search", apiGatewayUrl);
      url.searchParams.set("user_prompt", query);
      const response = await fetchImpl(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Semantic search request failed.");
      }

      const articles: unknown = await response.json();

      if (!isSemanticSearchArticles(articles)) {
        throw new Error("Semantic search response is invalid.");
      }

      return articles.map(({ url, title, source, dist }) => ({ url, title, source, dist }));
    };

    // Shared cache fills must outlive the browser request that started them.
    const requestPromise = loadArticles();
    pendingRequests.set(query, requestPromise);

    try {
      return await requestPromise;
    } finally {
      pendingRequests.delete(query);
    }
  }, {
    keyParts: ["semantic-search-v1", apiGatewayUrl ?? ""],
    maxAgeSeconds: ONE_HOUR_REVALIDATE,
    onRefreshError: (error) => {
      console.error(formatLogMessage("Failed to refresh semantic search cache."), error);
    },
  });

  return async function GET(request: Request) {
    if (!(await getCurrentUserImpl())) {
      return json({ error: "Unauthorized." }, 401);
    }

    const query = normalizeSearchQuery(new URL(request.url).searchParams.get("user_prompt") ?? "");

    if (!query) {
      return json({ error: "A search query is required." }, 400);
    }

    try {
      const articles = await getCachedArticles(query);

      return json({
        total: articles.length,
        articles,
      }, 200);
    } catch {
      return json({ error: "Failed to complete semantic search." }, 502);
    }
  };
}
