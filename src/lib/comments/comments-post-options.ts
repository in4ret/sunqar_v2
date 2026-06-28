import { encodeCommentPostFilterValue } from "@/lib/comments/comments-filters";
import type { MultiSelectOption } from "@/ui";

type CommentPostOptionItem = {
  channel: string;
  channelName: string | null;
  contentId: string;
  contentTitle: string | null;
  source: string;
};

function normalizeOptionLabel(value: string | null | undefined, emptyValue: string) {
  return value?.trim() || emptyValue;
}

function compareByLabel(left: { label: string; value: string }, right: { label: string; value: string }) {
  return left.label.localeCompare(right.label, "en", { sensitivity: "base" }) ||
    left.value.localeCompare(right.value, "en", { sensitivity: "base" });
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
        children: MultiSelectOption[];
        label: string;
        value: string;
      }
    >
  >();

  for (const post of posts) {
    const sourceGroup = sourceGroups.get(post.source) ?? new Map();
    const channelValue = `source:${encodeURIComponent(post.source)}/channel:${encodeURIComponent(post.channel)}`;
    const channelGroup = sourceGroup.get(channelValue) ?? {
      children: [],
      label: normalizeOptionLabel(post.channelName, emptyValue),
      value: channelValue,
    };

    channelGroup.children.push({
      label: normalizeOptionLabel(post.contentTitle, emptyValue),
      value: encodeCommentPostFilterValue({
        channel: post.channel,
        contentId: post.contentId,
        source: post.source,
      }),
    });
    sourceGroup.set(channelValue, channelGroup);
    sourceGroups.set(post.source, sourceGroup);
  }

  return [...sourceGroups.entries()]
    .map<MultiSelectOption>(([source, channelGroups]) => ({
      children: [...channelGroups.values()]
        .map<MultiSelectOption>((channelGroup) => ({
          children: [...channelGroup.children].sort(compareByLabel),
          label: channelGroup.label,
          value: channelGroup.value,
        }))
        .sort(compareByLabel),
      label: source,
      value: `source:${encodeURIComponent(source)}`,
    }))
    .sort(compareByLabel);
}
