import { requireRole } from "@/lib/auth/auth";
import { listPosts } from "@/lib/posts/posts";

import { CommentsPageView } from "./comments-page-view/comments-page-view";

export default async function CommentsPage() {
  await requireRole(["admin", "user"]);

  const allPosts = await listPosts();

  return (
    <CommentsPageView
      allPosts={allPosts.map((post) => ({
        channel: post.channel,
        channelName: post.channelName,
        contentId: post.contentId,
        contentTitle: post.contentTitle,
        id: post.id,
        source: post.source,
      }))}
    />
  );
}
