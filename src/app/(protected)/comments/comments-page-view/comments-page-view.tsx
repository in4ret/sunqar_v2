"use client";

import { useTranslations } from "next-intl";

import { CommentsSyncForm } from "../comments-sync-form/comments-sync-form";

import styles from "../page.module.scss";

type PostView = {
  channel: string;
  channelName: string | null;
  contentId: string;
  contentTitle: string | null;
  id: string;
  source: string;
};

type CommentsPageViewProps = {
  allPosts: PostView[];
};

export function CommentsPageView({ allPosts }: CommentsPageViewProps) {
  const t = useTranslations();
  const emptyValue = "—";

  return (
    <section className={styles["comments-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles["eyebrow"]}>{t("comments.eyebrow")}</p>
          <h1 className={styles["title"]}>{t("comments.title")}</h1>
          <p className={styles["description"]}>{t("comments.description")}</p>
        </div>
        <CommentsSyncForm />
      </div>
      {allPosts.length > 0 ? (
        <div className={styles["comments-list"]}>
          {allPosts.map((post) => (
            <article className={styles["comment-card"]} key={post.id}>
              <p className={styles["comment-line"]}>
                <span className={styles["comment-label"]}>{t("comments.fields.source")}:</span>{" "}
                <span className={styles["comment-value"]}>{post.source}</span>
              </p>
              <p className={styles["comment-line"]}>
                <span className={styles["comment-label"]}>{t("comments.fields.channel")}:</span>{" "}
                <span className={styles["comment-value"]}>{post.channel}</span>
              </p>
              <p className={styles["comment-line"]}>
                <span className={styles["comment-label"]}>{t("comments.fields.channel-name")}:</span>{" "}
                <span className={styles["comment-value"]}>{post.channelName?.trim() || emptyValue}</span>
              </p>
              <p className={styles["comment-line"]}>
                <span className={styles["comment-label"]}>{t("comments.fields.content-id")}:</span>{" "}
                <span className={styles["comment-value"]}>{post.contentId}</span>
              </p>
              <p className={styles["comment-line"]}>
                <span className={styles["comment-label"]}>{t("comments.fields.content-title")}:</span>{" "}
                <span className={styles["comment-value"]}>{post.contentTitle?.trim() || emptyValue}</span>
              </p>
            </article>
          ))}
        </div>
      ) : (
        <section className={styles["empty-state"]}>
          <p className={styles["empty-state-copy"]}>{t("comments.empty")}</p>
        </section>
      )}
    </section>
  );
}
