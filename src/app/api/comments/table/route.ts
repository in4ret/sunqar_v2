import { getCurrentUser } from "@/lib/auth/auth";
import { listCommentsTableRows } from "@/lib/comments/comments-table";
import { createCommentsTablePostHandler } from "@/lib/comments/comments-table-route";

export const POST = createCommentsTablePostHandler({
  getCurrentUserImpl: getCurrentUser,
  listCommentsTableRowsImpl: listCommentsTableRows,
});
