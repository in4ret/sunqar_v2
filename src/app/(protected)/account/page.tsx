import { getCurrentSession, listActiveSessionsByUserId } from "@/lib/auth/auth";

import { AccountPageView } from "./account-page-view/account-page-view";

export default async function AccountPage() {
  const currentSession = await getCurrentSession();
  const user = currentSession?.user ?? null;
  const activeSessions = user ? await listActiveSessionsByUserId(user.id) : [];
  const displayName = user?.displayName ?? user?.login ?? "User";

  return (
    <AccountPageView
      activeSessions={activeSessions.map((session) => ({
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        id: session.id,
        ip: session.ip,
        ipGeo: session.ipGeo,
        lastSeenAt: session.lastSeenAt.toISOString(),
      }))}
      currentSessionId={currentSession?.sessionId ?? null}
      displayName={displayName}
    />
  );
}
