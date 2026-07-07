"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { submitUploadYoutubePosts, type UploadYoutubePostsState } from "@/app/(protected)/comments/actions";
import { translateActionMessage } from "@/lib/i18n/action-messages";
import { useToast } from "@/ui";

import styles from "./comments-upload-form.module.scss";

const initialState: UploadYoutubePostsState = {
  error: null,
  success: null,
};

const YOUTUBE_URLS_FIELD_NAME = "sunqar-comments-upload-youtube-urls";

export function CommentsUploadForm() {
  const [state, formAction, isPending] = useActionState(submitUploadYoutubePosts, initialState);
  const router = useRouter();
  const t = useTranslations();
  const { showToast } = useToast();

  useEffect(() => {
    const successMessage = translateActionMessage(t, state.success);

    if (!successMessage) {
      return;
    }

    showToast({ message: successMessage, status: "success" });
    router.refresh();
  }, [router, showToast, state.success, t]);

  useEffect(() => {
    const errorMessage = translateActionMessage(t, state.error);

    if (!errorMessage) {
      return;
    }

    showToast({ message: errorMessage, status: "error" });
  }, [showToast, state.error, t]);

  return (
    <form action={formAction} className={styles["comments-upload-form"]}>
      <label className={styles["field-label"]} htmlFor={YOUTUBE_URLS_FIELD_NAME}>
        {t("comments.upload.youtube-urls-label")}
      </label>
      <textarea
        className={styles["textarea"]}
        disabled={isPending}
        id={YOUTUBE_URLS_FIELD_NAME}
        name={YOUTUBE_URLS_FIELD_NAME}
        rows={10}
      />
      <button className={styles["submit-button"]} disabled={isPending} type="submit">
        {isPending ? t("comments.upload.submitting") : t("comments.upload.submit")}
      </button>
    </form>
  );
}
