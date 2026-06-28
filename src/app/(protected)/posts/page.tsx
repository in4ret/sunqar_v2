import { requireRole } from "@/lib/auth/auth";
import { listPosts } from "@/lib/posts/posts";

import { PostsPageView } from "./posts-page-view/posts-page-view";

export default async function PostsPage() {
  await requireRole("admin");

  const allPosts = await listPosts();

  return (
    <PostsPageView
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
