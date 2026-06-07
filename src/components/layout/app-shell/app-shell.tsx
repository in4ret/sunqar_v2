import { getCurrentUser } from "@/lib/auth/auth";
import { listTasksByUserId } from "@/lib/tasks";

import { AppShellView } from "../app-shell-view/app-shell-view";

type AppShellProps = Readonly<{
  children: React.ReactNode;
  mainClassName?: string;
}>;

export async function AppShell({ children, mainClassName = "app-main" }: AppShellProps) {
  const user = await getCurrentUser();
  const headerTasks = user ? await listTasksByUserId(user.id) : [];

  return (
    <AppShellView
      mainClassName={mainClassName}
      tasks={headerTasks}
      user={
        user
          ? {
              displayName: user.displayName,
              login: user.login,
              role: user.role,
            }
          : null
      }
    >
      {children}
    </AppShellView>
  );
}
