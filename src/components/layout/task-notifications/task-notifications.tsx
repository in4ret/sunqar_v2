"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useHeaderTasks } from "@/components/layout/header-tasks-provider/header-tasks-provider";
import { getTaskPreviewRoute, getTaskRoute } from "@/lib/routes";
import type { HeaderTaskItem } from "@/lib/tasks";
import {
  BellIcon,
  CircleCheckIcon,
  CircleXIcon,
  LoaderCircleIcon,
  TrashIcon,
  useToast,
} from "@/ui";

import styles from "./task-notifications.module.scss";

export function TaskNotifications() {
  const t = useTranslations();
  const locale = useLocale();
  const { removeTask, status, tasks } = useHeaderTasks();
  const { showToast } = useToast();
  const dialogId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hiddenTaskIds, setHiddenTaskIds] = useState<string[]>([]);
  const [deletingTaskIds, setDeletingTaskIds] = useState<string[]>([]);
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );
  const hasPendingTasks = useMemo(
    () => tasks.some((task) => task.status === "pending"),
    [tasks],
  );
  const unreadTasksCount = useMemo(
    () => tasks.filter((task) => !task.read && task.status === "success").length,
    [tasks],
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
  const visibleTasks = useMemo(
    () => tasks.filter((task) => !hiddenTaskIds.includes(task.taskId)),
    [hiddenTaskIds, tasks],
  );

  async function handleDeleteTask(task: HeaderTaskItem) {
    if (task.status === "pending" || deletingTaskIds.includes(task.taskId)) {
      return;
    }

    setDeletingTaskIds((currentTaskIds) => [...currentTaskIds, task.taskId]);
    setHiddenTaskIds((currentTaskIds) => [...currentTaskIds, task.taskId]);

    try {
      const response = await fetch(getTaskRoute(task.taskId), {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task ${task.taskId}.`);
      }

      removeTask(task.taskId);
      showToast({ message: t("header.tasks.delete-success"), status: "success" });
    } catch (error) {
      console.error("Failed to delete task notification.", error);
      setHiddenTaskIds((currentTaskIds) =>
        currentTaskIds.filter((taskId) => taskId !== task.taskId),
      );
      showToast({
        message: t("header.tasks.delete-error"),
        status: "error",
      });
    } finally {
      setDeletingTaskIds((currentTaskIds) =>
        currentTaskIds.filter((taskId) => taskId !== task.taskId),
      );
    }
  }

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
        {hasPendingTasks ? (
          <span
            aria-hidden="true"
            className={styles["task-notifications-button-spinner"]}
            data-status="pending"
          >
            <TaskStatusIcon
              className={styles["task-notifications-button-spinner-shape"]}
              status="pending"
            />
          </span>
        ) : null}
        {unreadTasksCount > 0 ? (
          <span aria-hidden="true" className={styles["task-notifications-unread-badge"]}>
            {unreadTasksCount}
          </span>
        ) : null}
      </button>
      {isOpen ? (
        <div
          id={dialogId}
          aria-label={t("header.tasks.title")}
          className={styles["task-notifications-panel"]}
          role="dialog"
        >
          {status === "loading" ? (
            <p className={styles["task-notifications-empty"]}>{t("header.tasks.loading")}</p>
          ) : status === "error" ? (
            <p className={styles["task-notifications-empty"]}>{t("header.tasks.load-error")}</p>
          ) : visibleTasks.length > 0 ? (
            <div className={styles["task-notifications-list"]}>
              {visibleTasks.map((task) => {
                const isUnreadTask = !task.read && task.status !== "failure";
                const isCompletedTask = task.status !== "pending";
                const isDeletingTask = deletingTaskIds.includes(task.taskId);
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
                  <article
                    key={task.taskId}
                    className={styles["task-notifications-item"]}
                    data-read={task.read ? "true" : "false"}
                    data-unread={isUnreadTask ? "true" : "false"}
                    data-status={task.status}
                  >
                    <div className={styles["task-notifications-item-top"]}>
                      {hasReportDetails ? (
                        task.downloadUrl ? (
                          <a
                            className={styles["task-notifications-report-link"]}
                            href={getTaskPreviewRoute(task.taskId)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <div className={styles["task-notifications-report"]}>
                              {isUnreadTask ? (
                                <span
                                  aria-hidden="true"
                                  className={styles["task-notifications-unread-indicator"]}
                                />
                              ) : null}
                              <div className={styles["task-notifications-report-content"]}>
                                {reportDetails}
                              </div>
                            </div>
                          </a>
                        ) : (
                          <div className={styles["task-notifications-report"]}>
                            {isUnreadTask ? (
                              <span
                                aria-hidden="true"
                                className={styles["task-notifications-unread-indicator"]}
                              />
                            ) : null}
                            <div className={styles["task-notifications-report-content"]}>
                              {reportDetails}
                            </div>
                          </div>
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
                        {isCompletedTask ? (
                          <button
                            aria-label={t("header.tasks.delete")}
                            className={styles["task-notifications-delete-button"]}
                            disabled={isDeletingTask}
                            type="button"
                            onClick={() => {
                              void handleDeleteTask(task);
                            }}
                          >
                            <TrashIcon className={styles["task-notifications-delete-icon"]} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {task.status === "failure" ? (
                      <p className={styles["task-notifications-error"]}>
                        {t("header.tasks.error-message")}
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
