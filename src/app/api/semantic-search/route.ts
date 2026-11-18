import { getCurrentUser } from "@/lib/auth/auth";
import { env } from "@/lib/env";
import { createSemanticSearchGetHandler } from "@/lib/semantic/semantic-search-route";

export const GET = createSemanticSearchGetHandler({
  getCurrentUserImpl: getCurrentUser,
  apiGatewayUrl: env.apiGatewayUrl,
  fetchImpl: fetch,
});
