import {
  formatCommentsChartSourceLabel,
  getCommentsSourceIconSrc,
} from "@/lib/comments/comments-chart-shared";
import { encodeCommentPostFilterValue } from "@/lib/comments/comments-filters";
import type { MultiSelectOption } from "@/ui";

type CommentPostOptionItem = {
  channel: string;
  channelName: string | null;
  contentId: string;
  contentTitle: string | null;
  publishedAt: string | null;
  source: string;
};

const YOUTUBE_POSTS_PER_CHANNEL_LIMIT = 20;

function normalizeOptionLabel(value: string | null | undefined, emptyValue: string) {
  return value?.trim() || emptyValue;
}

function compareByLabel(left: { label: string; value: string }, right: { label: string; value: string }) {
  return left.label.localeCompare(right.label, "en", { sensitivity: "base" }) ||
    left.value.localeCompare(right.value, "en", { sensitivity: "base" });
}

function compareByPublishedAtDesc(left: CommentPostOptionItem, right: CommentPostOptionItem) {
  const leftPublishedAt = left.publishedAt?.trim() ?? "";
  const rightPublishedAt = right.publishedAt?.trim() ?? "";

  if (leftPublishedAt && rightPublishedAt) {
    return rightPublishedAt.localeCompare(leftPublishedAt, "en", { sensitivity: "base" });
  }

  if (leftPublishedAt) {
    return -1;
  }

  if (rightPublishedAt) {
    return 1;
  }

  return 0;
}

function mapPostToOption(post: CommentPostOptionItem, emptyValue: string): MultiSelectOption {
  return {
    label: normalizeOptionLabel(post.contentTitle, emptyValue),
    value: encodeCommentPostFilterValue({
      channel: post.channel,
      contentId: post.contentId,
      source: post.source,
    }),
  };
}

function preparePosts(posts: CommentPostOptionItem[]) {
  const postsBySourceAndChannel = new Map<string, CommentPostOptionItem[]>();

  for (const post of posts) {
    const sourceAndChannelKey = `${post.source}\u0000${post.channel}`;
    const channelPosts = postsBySourceAndChannel.get(sourceAndChannelKey) ?? [];

    channelPosts.push(post);
    postsBySourceAndChannel.set(sourceAndChannelKey, channelPosts);
  }

  return [...postsBySourceAndChannel.values()].flatMap((channelPosts) => {
    if (channelPosts[0]?.source !== "youtube") {
      return channelPosts;
    }

    return [...channelPosts]
      .sort(compareByPublishedAtDesc)
      .slice(0, YOUTUBE_POSTS_PER_CHANNEL_LIMIT);
  });
}

export function buildCommentPostOptions({
  emptyValue,
  posts,
}: {
  emptyValue: string;
  posts: CommentPostOptionItem[];
}) {
  const sourceGroups = new Map<
    string,
    Map<
      string,
      {
        children: CommentPostOptionItem[];
        label: string;
        source: string;
        value: string;
      }
    >
  >();

  for (const post of preparePosts(posts)) {
    const sourceGroup = sourceGroups.get(post.source) ?? new Map();
    const channelValue = `source:${encodeURIComponent(post.source)}/channel:${encodeURIComponent(post.channel)}`;
    const channelGroup = sourceGroup.get(channelValue) ?? {
      children: [],
      label: normalizeOptionLabel(post.channelName, emptyValue),
      source: post.source,
      value: channelValue,
    };

    channelGroup.children.push(post);
    sourceGroup.set(channelValue, channelGroup);
    sourceGroups.set(post.source, sourceGroup);
  }

  return [...sourceGroups.entries()]
    .map<MultiSelectOption>(([source, channelGroups]) => ({
      children: [...channelGroups.values()]
        .map<MultiSelectOption>((channelGroup) => ({
          children:
            channelGroup.source === "youtube"
              ? channelGroup.children.map((post) => mapPostToOption(post, emptyValue))
              : channelGroup.children.map((post) => mapPostToOption(post, emptyValue)).sort(compareByLabel),
          label: channelGroup.label,
          value: channelGroup.value,
        }))
        .sort(compareByLabel),
      iconSrc: getCommentsSourceIconSrc(source),
      label: formatCommentsChartSourceLabel(source),
      value: `source:${encodeURIComponent(source)}`,
    }))
    .sort(compareByLabel);
}
