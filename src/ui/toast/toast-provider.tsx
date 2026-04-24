"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toast, type ToastStatus } from "./toast";
import styles from "./toast.module.scss";

type ToastItem = {
  duration: number;
  id: number;
  message: string;
  status: ToastStatus;
};

type ShowToastOptions = {
  duration?: number;
  message: string;
  status: ToastStatus;
};

type ToastContextValue = {
  showToast: (options: ShowToastOptions) => number;
};

type ToastProviderProps = Readonly<{
  children: ReactNode;
}>;

const defaultDuration = 3000;
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: ToastProviderProps) {
  const nextToastId = useRef(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  }, []);

  const showToast = useCallback(
    ({ duration = defaultDuration, message, status }: ShowToastOptions) => {
      nextToastId.current += 1;

      const id = nextToastId.current;

      setToasts((currentToasts) => [
        ...currentToasts,
        { duration, id, message, status },
      ]);

      window.setTimeout(() => {
        dismissToast(id);
      }, duration);

      return id;
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles["toast-viewport"]}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            duration={toast.duration}
            message={toast.message}
            onDismiss={() => {
              dismissToast(toast.id);
            }}
            status={toast.status}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
