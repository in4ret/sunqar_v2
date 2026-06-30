import "server-only";

import { unstable_cache } from "next/cache";

import { buildCommentPostOptions } from "@/lib/comments/comments-post-options";
import { listPosts } from "@/lib/posts/posts";
import type { MultiSelectOption } from "@/ui";

export const COMMENTS_POST_OPTIONS_TAG = "comments:post-options";

export type CommentsPostOptionsData = {
  availablePostValues: string[];
  postOptions: MultiSelectOption[];
};

function collectAvailablePostValues(options: MultiSelectOption[]) {
  const values = new Set<string>();

  function collectValues(currentOptions: MultiSelectOption[]) {
    for (const option of currentOptions) {
      if (option.children && option.children.length > 0) {
        collectValues(option.children);
        continue;
      }

      values.add(option.value);
    }
  }

  collectValues(options);

  return [...values].sort((left, right) => left.localeCompare(right, "en"));
}

async function buildCommentsPostOptionsData(): Promise<CommentsPostOptionsData> {
  const posts = await listPosts();
  const postOptions = buildCommentPostOptions({
    emptyValue: "—",
    posts: posts.map((post) => ({
      channel: post.channel,
      channelName: post.channelName,
      contentId: post.contentId,
      contentTitle: post.contentTitle,
      publishedAt: post.publishedAt,
      source: post.source,
    })),
  });

  return {
    availablePostValues: collectAvailablePostValues(postOptions),
    postOptions,
  };
}

const getCachedCommentsPostOptions = unstable_cache(
  async () => buildCommentsPostOptionsData(),
  ["comments-post-options-v1"],
  {
    tags: [COMMENTS_POST_OPTIONS_TAG],
  },
);

export async function getCommentsPostOptions() {
  return getCachedCommentsPostOptions();
}
