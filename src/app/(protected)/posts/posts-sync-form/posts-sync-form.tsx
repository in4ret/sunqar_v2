"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { submitSyncPosts, type SyncPostsState } from "@/app/(protected)/posts/actions";
import { translateActionMessage } from "@/lib/i18n/action-messages";
import { useToast } from "@/ui";

import styles from "./posts-sync-form.module.scss";

const initialState: SyncPostsState = {
  error: null,
  success: null,
};

export function PostsSyncForm() {
  const [state, formAction, isPending] = useActionState(submitSyncPosts, initialState);
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
    <form action={formAction}>
      <button className={styles["submit-button"]} disabled={isPending} type="submit">
        {isPending ? t("posts.sync.submitting") : t("posts.sync.submit")}
      </button>
    </form>
  );
}
