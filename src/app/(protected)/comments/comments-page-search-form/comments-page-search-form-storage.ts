"use client";

import { useSyncExternalStore } from "react";

type CommentsPageSearchFormStorageConfig = {
  changeEventName: string;
  storageKey: string;
};

const DEFAULT_STORED_COMMENTS_PAGE_POSTS: string[] = [];
const storedCommentsPagePostsCache = new Map<
  string,
  {
    posts: string[];
    rawValue: string | null;
  }
>();

export const COMMENTS_PAGE_SEARCH_FORM_STORAGE_CONFIG: CommentsPageSearchFormStorageConfig = {
  changeEventName: "sunqar-comments-posts-change",
  storageKey: "sunqar-comments-posts",
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function getStoredCommentsPagePosts(config: CommentsPageSearchFormStorageConfig) {
  if (typeof window === "undefined") {
    return DEFAULT_STORED_COMMENTS_PAGE_POSTS;
  }

  const storedValue = window.localStorage.getItem(config.storageKey);
  const cachedValue = storedCommentsPagePostsCache.get(config.storageKey);

  if (cachedValue?.rawValue === storedValue) {
    return cachedValue.posts;
  }

  if (!storedValue) {
    storedCommentsPagePostsCache.set(config.storageKey, {
      posts: DEFAULT_STORED_COMMENTS_PAGE_POSTS,
      rawValue: null,
    });

    return DEFAULT_STORED_COMMENTS_PAGE_POSTS;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!isStringArray(parsedValue)) {
      storedCommentsPagePostsCache.set(config.storageKey, {
        posts: DEFAULT_STORED_COMMENTS_PAGE_POSTS,
        rawValue: storedValue,
      });

      return DEFAULT_STORED_COMMENTS_PAGE_POSTS;
    }

    storedCommentsPagePostsCache.set(config.storageKey, {
      posts: parsedValue,
      rawValue: storedValue,
    });

    return parsedValue;
  } catch {
    storedCommentsPagePostsCache.set(config.storageKey, {
      posts: DEFAULT_STORED_COMMENTS_PAGE_POSTS,
      rawValue: storedValue,
    });

    return DEFAULT_STORED_COMMENTS_PAGE_POSTS;
  }
}

export function subscribeToStoredCommentsPagePosts(
  config: CommentsPageSearchFormStorageConfig,
  onStoreChange: () => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(config.changeEventName, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(config.changeEventName, handleChange);
  };
}

export function setStoredCommentsPagePosts(
  config: CommentsPageSearchFormStorageConfig,
  posts: string[],
) {
  window.localStorage.setItem(config.storageKey, JSON.stringify(posts));
  window.dispatchEvent(new Event(config.changeEventName));
}

export function useStoredCommentsPagePosts(config: CommentsPageSearchFormStorageConfig) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToStoredCommentsPagePosts(config, onStoreChange),
    () => getStoredCommentsPagePosts(config),
    () => null,
  );
}
