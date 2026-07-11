"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { formatLogMessage } from "@/lib/logs";
import { routes } from "@/lib/routes";
import type { HeaderTaskItem } from "@/lib/tasks";

type HeaderTasksStatus = "loading" | "ready" | "error";

type HeaderTasksContextValue = {
  removeTask(taskId: string): void;
  status: HeaderTasksStatus;
  tasks: HeaderTaskItem[];
};

const HeaderTasksContext = createContext<HeaderTasksContextValue | null>(null);

type HeaderTasksProviderProps = {
  children: ReactNode;
};

export function HeaderTasksProvider({ children }: HeaderTasksProviderProps) {
  const [tasks, setTasks] = useState<HeaderTaskItem[]>([]);
  const [status, setStatus] = useState<HeaderTasksStatus>("loading");
  const hasReceivedSnapshotRef = useRef(false);

  useEffect(() => {
    const eventSource = new EventSource(routes.taskStreamApi);

    function handleSnapshot(event: MessageEvent<string>) {
      try {
        const nextTasks = JSON.parse(event.data) as HeaderTaskItem[];

        hasReceivedSnapshotRef.current = true;
        setTasks(nextTasks);
        setStatus("ready");
      } catch (error) {
        console.error(formatLogMessage("Failed to parse header tasks snapshot."), error);

        if (!hasReceivedSnapshotRef.current) {
          setStatus("error");
        }
      }
    }

    function handleError() {
      if (!hasReceivedSnapshotRef.current) {
        setStatus("error");
      }
    }

    eventSource.addEventListener("snapshot", handleSnapshot as EventListener);
    eventSource.addEventListener("error", handleError as EventListener);

    return () => {
      eventSource.removeEventListener("snapshot", handleSnapshot as EventListener);
      eventSource.removeEventListener("error", handleError as EventListener);
      eventSource.close();
    };
  }, []);

  const value = useMemo<HeaderTasksContextValue>(
    () => ({
      removeTask(taskId: string) {
        setTasks((currentTasks) => currentTasks.filter((task) => task.taskId !== taskId));
      },
      status,
      tasks,
    }),
    [status, tasks],
  );

  return <HeaderTasksContext.Provider value={value}>{children}</HeaderTasksContext.Provider>;
}

export function useHeaderTasks() {
  const context = useContext(HeaderTasksContext);

  if (!context) {
    throw new Error("useHeaderTasks must be used within HeaderTasksProvider");
  }

  return context;
}
