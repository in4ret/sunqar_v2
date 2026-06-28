import { getCurrentUser } from "@/lib/auth/auth";
import { countComments } from "@/lib/comments/comments-count";
import { createCommentsCountPostHandler } from "@/lib/comments/comments-count-route";

export const POST = createCommentsCountPostHandler({
  countCommentsImpl: countComments,
  getCurrentUserImpl: getCurrentUser,
});
