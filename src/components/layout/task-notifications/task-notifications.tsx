"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { getTaskPreviewRoute } from "@/lib/routes";
import type { HeaderTaskItem } from "@/lib/tasks";
import { BellIcon, CircleCheckIcon, CircleXIcon, LoaderCircleIcon } from "@/ui";

import styles from "./task-notifications.module.scss";

type TaskNotificationsProps = {
  tasks: HeaderTaskItem[];
};

const errorPreviewMaxLength = 160;

export function TaskNotifications({ tasks }: TaskNotificationsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const dialogId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={styles["task-notifications"]}>
      <button
        ref={buttonRef}
        aria-controls={dialogId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={t("header.tasks.toggle")}
        className={styles["task-notifications-button"]}
        type="button"
        onClick={() => {
          setIsOpen((currentIsOpen) => !currentIsOpen);
        }}
      >
        <BellIcon className={styles["task-notifications-icon"]} />
      </button>
      {isOpen ? (
        <div
          id={dialogId}
          aria-label={t("header.tasks.title")}
          className={styles["task-notifications-panel"]}
          role="dialog"
        >
          <div className={styles["task-notifications-header"]}>
            <p className={styles["task-notifications-title"]}>{t("header.tasks.title")}</p>
          </div>
          {tasks.length > 0 ? (
            <div className={styles["task-notifications-list"]}>
              {tasks.map((task) => {
                const taskDate =
                  task.status === "pending" || !task.doneAt ? task.createdAt : task.doneAt;
                const formattedTaskDate = dateTimeFormatter.format(new Date(taskDate));
                const hasReportDetails = Boolean(task.reportTitle);
                const reportDetails = hasReportDetails ? (
                  <>
                    <p className={styles["task-notifications-report-title"]}>{task.reportTitle}</p>
                    {task.reportDescription ? (
                      <p
                        className={styles["task-notifications-report-description"]}
                        title={task.reportDescription}
                      >
                        {task.reportDescription}
                      </p>
                    ) : null}
                  </>
                ) : null;

                return (
                  <article key={task.taskId} className={styles["task-notifications-item"]}>
                    <div className={styles["task-notifications-item-top"]}>
                      {hasReportDetails ? (
                        task.downloadUrl ? (
                          <a
                            className={styles["task-notifications-report-link"]}
                            href={getTaskPreviewRoute(task.taskId)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <div className={styles["task-notifications-report"]}>{reportDetails}</div>
                          </a>
                        ) : (
                          <div className={styles["task-notifications-report"]}>{reportDetails}</div>
                        )
                      ) : (
                        <div className={styles["task-notifications-report"]} />
                      )}
                      <div className={styles["task-notifications-meta"]}>
                        <span
                          aria-label={t(`header.tasks.statuses.${task.status}`)}
                          className={styles["task-notifications-status-icon"]}
                          data-status={task.status}
                          role="img"
                        >
                          <TaskStatusIcon
                            className={styles["task-notifications-status-icon-shape"]}
                            status={task.status}
                          />
                        </span>
                        <time
                          className={styles["task-notifications-date"]}
                          dateTime={taskDate}
                          title={formattedTaskDate}
                        >
                          {formattedTaskDate}
                        </time>
                      </div>
                    </div>
                    {task.status === "failure" && task.error ? (
                      <p
                        className={styles["task-notifications-error"]}
                        title={task.error}
                      >
                        {truncateError(task.error)}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className={styles["task-notifications-empty"]}>{t("header.tasks.empty")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TaskStatusIcon({
  className,
  status,
}: {
  className: string;
  status: HeaderTaskItem["status"];
}) {
  if (status === "success") {
    return <CircleCheckIcon className={className} />;
  }

  if (status === "failure") {
    return <CircleXIcon className={className} />;
  }

  return <LoaderCircleIcon className={className} />;
}

function truncateError(value: string) {
  if (value.length <= errorPreviewMaxLength) {
    return value;
  }

  return `${value.slice(0, errorPreviewMaxLength - 1)}…`;
}
