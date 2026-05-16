import { listUsersWithActiveSessions, requireRole } from "@/lib/auth/auth";

import { UsersPageView } from "./users-page-view/users-page-view";

export default async function UsersPage() {
  await requireRole("admin");
  const allUsers = await listUsersWithActiveSessions();

  return (
    <UsersPageView
      allUsers={allUsers.map((user) => ({
        activeSessions: user.activeSessions.map((session) => ({
          id: session.id,
          ip: session.ip,
          ipGeo: session.ipGeo,
        })),
        createdAt: user.createdAt.toISOString(),
        displayName: user.displayName,
        id: user.id,
        isActive: user.isActive,
        login: user.login,
        role: user.role,
      }))}
    />
  );
}
