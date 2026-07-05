import { getCurrentUser } from "@/lib/auth/auth";
import { listCommentsRelatedTableRows } from "@/lib/comments/comments-related-table";
import { createCommentsRelatedTablePostHandler } from "@/lib/comments/comments-related-table-route";

export const POST = createCommentsRelatedTablePostHandler({
  getCurrentUserImpl: getCurrentUser,
  listCommentsRelatedTableRowsImpl: listCommentsRelatedTableRows,
});
