"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/auth";
import { type ActionMessage, createActionMessage } from "@/lib/i18n/action-messages";
import { uploadYoutubePosts, UploadYoutubePostsError } from "@/lib/posts/posts-upload";

export type UploadYoutubePostsState = {
  error: ActionMessage | null;
  success: ActionMessage | null;
};

const YOUTUBE_URLS_FIELD_NAME = "sunqar-comments-upload-youtube-urls";

export async function submitUploadYoutubePosts(
  previousState: UploadYoutubePostsState,
  formData: FormData,
): Promise<UploadYoutubePostsState> {
  void previousState;
  const user = await requireAuth();

  const rawInput = formData.get(YOUTUBE_URLS_FIELD_NAME);
  const urlsInput = typeof rawInput === "string" ? rawInput : "";

  try {
    await uploadYoutubePosts(urlsInput, user.id);

    revalidatePath("/comments/upload");

    return {
      error: null,
      success: createActionMessage("messages.comments-uploaded-youtube-posts"),
    };
  } catch (error) {
    if (error instanceof UploadYoutubePostsError) {
      return {
        error: createActionMessage(`errors.${error.code}`),
        success: null,
      };
    }

    console.error("Failed to upload YouTube posts from comments tab.", error);

    return {
      error: createActionMessage("errors.comments-upload-failed"),
      success: null,
    };
  }
}
