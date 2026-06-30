"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireRole } from "@/lib/auth/auth";
import { COMMENTS_POST_OPTIONS_TAG } from "@/lib/comments";
import { type ActionMessage, createActionMessage } from "@/lib/i18n/action-messages";
import { syncPosts } from "@/lib/posts/posts";
import { routes } from "@/lib/routes";

export type SyncPostsState = {
  error: ActionMessage | null;
  success: ActionMessage | null;
};

export async function submitSyncPosts(
  previousState: SyncPostsState,
): Promise<SyncPostsState> {
  void previousState;
  await requireRole("admin");

  try {
    const result = await syncPosts();

    revalidatePath(routes.posts);
    updateTag(COMMENTS_POST_OPTIONS_TAG);

    return {
      error: null,
      success: createActionMessage("messages.posts-synced", {
        count: result.insertedCount,
      }),
    };
  } catch (error) {
    console.error("Failed to sync posts from comments.", error);

    return {
      error: createActionMessage("errors.posts-sync-failed"),
      success: null,
    };
  }
}
