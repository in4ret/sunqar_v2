"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { PostsSyncForm } from "../posts-sync-form/posts-sync-form";

import styles from "../page.module.scss";

type PostView = {
  channel: string;
  channelName: string | null;
  contentId: string;
  contentTitle: string | null;
  id: string;
  source: string;
};

type PostsPageViewProps = {
  allPosts: PostView[];
};

type PostLinkView = {
  contentId: string;
  contentTitle: string;
  id: string;
  source: string;
};

type PostsChannelGroup = {
  posts: PostLinkView[];
  key: string;
  label: string;
};

type PostsSourceGroup = {
  channels: PostsChannelGroup[];
  key: string;
  label: string;
};

function normalizePostValue(value: string | null | undefined, emptyValue: string) {
  return value?.trim() || emptyValue;
}

function buildAccordionId(...parts: string[]) {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildPostHref(post: Pick<PostView, "contentId" | "source">) {
  const contentId = post.contentId.trim();

  if (!contentId) {
    return null;
  }

  if (post.source === "youtube") {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(contentId)}`;
  }

  if (post.source === "ig" || post.source === "tiktok") {
    try {
      return new URL(contentId).toString();
    } catch {
      return null;
    }
  }

  return null;
}

function groupPostsBySource(allPosts: PostView[], emptyValue: string): PostsSourceGroup[] {
  const sourceGroups = new Map<string, { channels: Map<string, PostsChannelGroup>; label: string }>();

  for (const post of allPosts) {
    const sourceKey = post.source;
    const channelLabel = normalizePostValue(post.channelName, emptyValue);
    const contentTitle = normalizePostValue(post.contentTitle, emptyValue);

    let sourceGroup = sourceGroups.get(sourceKey);

    if (!sourceGroup) {
      sourceGroup = {
        channels: new Map<string, PostsChannelGroup>(),
        label: sourceKey,
      };

      sourceGroups.set(sourceKey, sourceGroup);
    }

    let channelGroup = sourceGroup.channels.get(channelLabel);

    if (!channelGroup) {
      channelGroup = {
        posts: [],
        key: channelLabel,
        label: channelLabel,
      };

      sourceGroup.channels.set(channelLabel, channelGroup);
    }

    channelGroup.posts.push({
      contentId: post.contentId,
      contentTitle,
      id: post.id,
      source: post.source,
    });
  }

  return Array.from(sourceGroups.entries()).map(([sourceKey, sourceGroup]) => ({
    channels: Array.from(sourceGroup.channels.values()),
    key: sourceKey,
    label: sourceGroup.label,
  }));
}

export function PostsPageView({ allPosts }: PostsPageViewProps) {
  const t = useTranslations();
  const emptyValue = "—";
  const [openSourceKey, setOpenSourceKey] = useState<string | null>(null);
  const [openChannelKeyBySource, setOpenChannelKeyBySource] = useState<Record<string, string | null>>({});
  const groupedPosts = groupPostsBySource(allPosts, emptyValue);

  const handleSourceToggle = (sourceKey: string) => {
    setOpenSourceKey((currentOpenSourceKey) => (currentOpenSourceKey === sourceKey ? null : sourceKey));
  };

  const handleChannelToggle = (sourceKey: string, channelKey: string) => {
    setOpenChannelKeyBySource((currentState) => ({
      ...currentState,
      [sourceKey]: currentState[sourceKey] === channelKey ? null : channelKey,
    }));
  };

  return (
    <section className={styles["posts-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <h1 className={styles["title"]}>{t("posts.title")}</h1>
        </div>
        <PostsSyncForm />
      </div>
      {allPosts.length > 0 ? (
        <div className={styles["posts-list"]}>
          {groupedPosts.map((sourceGroup) => {
            const isSourceOpen = openSourceKey === sourceGroup.key;
            const openChannelKey = openChannelKeyBySource[sourceGroup.key] ?? null;
            const sourcePanelId = buildAccordionId("posts", "source", "panel", sourceGroup.key);

            return (
              <article className={styles["source-accordion-item"]} key={sourceGroup.key}>
                <button
                  aria-controls={sourcePanelId}
                  aria-expanded={isSourceOpen}
                  className={styles["source-accordion-trigger"]}
                  onClick={() => handleSourceToggle(sourceGroup.key)}
                  type="button"
                >
                  <span className={styles["accordion-title"]}>{sourceGroup.label}</span>
                  <span className={styles["accordion-meta"]}>
                    <span className={styles["accordion-count"]}>{sourceGroup.channels.length}</span>
                    <span className={styles["accordion-indicator"]} aria-hidden="true">
                      {isSourceOpen ? "−" : "+"}
                    </span>
                  </span>
                </button>
                {isSourceOpen ? (
                  <div className={styles["source-accordion-panel"]} id={sourcePanelId}>
                    {sourceGroup.channels.map((channelGroup) => {
                      const isChannelOpen = openChannelKey === channelGroup.key;
                      const channelPanelId = buildAccordionId(
                        "posts",
                        "channel",
                        "panel",
                        sourceGroup.key,
                        channelGroup.key,
                      );

                      return (
                        <section className={styles["channel-accordion-item"]} key={channelGroup.key}>
                          <button
                            aria-controls={channelPanelId}
                            aria-expanded={isChannelOpen}
                            className={styles["channel-accordion-trigger"]}
                            onClick={() => handleChannelToggle(sourceGroup.key, channelGroup.key)}
                            type="button"
                          >
                            <span className={styles["accordion-title"]}>{channelGroup.label}</span>
                            <span className={styles["accordion-meta"]}>
                              <span className={styles["accordion-count"]}>{channelGroup.posts.length}</span>
                              <span className={styles["accordion-indicator"]} aria-hidden="true">
                                {isChannelOpen ? "−" : "+"}
                              </span>
                            </span>
                          </button>
                          {isChannelOpen ? (
                            <div className={styles["channel-accordion-panel"]} id={channelPanelId}>
                              <ul className={styles["content-title-list"]}>
                                {channelGroup.posts.map((post) => {
                                  const href = buildPostHref(post);

                                  return (
                                    <li className={styles["content-title-item"]} key={post.id}>
                                      {href ? (
                                        <a
                                          className={styles["content-title-link"]}
                                          href={href}
                                          rel="noreferrer"
                                          target="_blank"
                                        >
                                          {post.contentTitle}
                                        </a>
                                      ) : (
                                        post.contentTitle
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ) : null}
                        </section>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <section className={styles["empty-state"]}>
          <p className={styles["empty-state-copy"]}>{t("posts.empty")}</p>
        </section>
      )}
    </section>
  );
}
