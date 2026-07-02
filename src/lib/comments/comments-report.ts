import "server-only";

import { manticoreSql } from "@/lib/manticore";

import { buildCommentsWhereClause, normalizeCommentsQueryInput } from "./comments-filters";

const MAX_MANTICORE_MATCHES = 10000;

type CommentIdRow = {
  row_id: string;
};

export async function listCommentIdsForReport(input: {
  from: string;
  posts: string[];
  query: string;
  to: string;
}) {
  const normalizedInput = normalizeCommentsQueryInput(input);
  const whereClause = buildCommentsWhereClause(
    normalizedInput.query,
    normalizedInput.posts,
    normalizedInput.from,
    normalizedInput.to,
  );
  const rows = await manticoreSql<CommentIdRow>(
    `SELECT TO_STRING(id) AS row_id FROM comments${whereClause} LIMIT 0, ${MAX_MANTICORE_MATCHES} OPTION max_matches=${MAX_MANTICORE_MATCHES}`,
  );

  return rows
    .map((row) => row.row_id.trim())
    .filter((rowId) => rowId.length > 0);
}
