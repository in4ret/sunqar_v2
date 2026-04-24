import crypto from "node:crypto";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, gt, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, users, type User } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "./password";
import {
  clearSessionCookie,
  createSession,
  deleteSessionByToken,
  getSessionTokenHash,
  readSessionToken,
} from "./session";

export type UserRole = User["role"];
export type LoginErrorCode = "invalid-credentials";
export type CreateUserErrorCode =
  | "user-fields-required"
  | "password-too-short"
  | "user-login-exists";

type SessionRecord = {
  sessionId: string;
  user: User;
};

export type ActiveSession = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ip: string | null;
  ipGeo: {
    country: string | null;
    region: string | null;
    city: string | null;
  } | null;
  lastSeenAt: Date;
};

export type UserWithActiveSessions = User & {
  activeSessions: ActiveSession[];
};

function mapActiveSession(input: {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ip: string | null;
  ipGeoCity: string | null;
  ipGeoCountry: string | null;
  ipGeoRegion: string | null;
  lastSeenAt: Date;
}): ActiveSession {
  return {
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    id: input.id,
    ip: input.ip,
    ipGeo:
      input.ipGeoCountry || input.ipGeoRegion || input.ipGeoCity
        ? {
            city: input.ipGeoCity,
            country: input.ipGeoCountry,
            region: input.ipGeoRegion,
          }
        : null,
    lastSeenAt: input.lastSeenAt,
  };
}

const readCurrentSession = cache(async (): Promise<SessionRecord | null> => {
  const token = await readSessionToken();

  if (!token) {
    return null;
  }

  const tokenHash = getSessionTokenHash(token);
  const now = new Date();
  const result = db
    .select({
      sessionId: sessions.id,
      sessionExpiresAt: sessions.expiresAt,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .get();

  if (!result || !result.user.isActive) {
    if (result) {
      db.delete(sessions).where(eq(sessions.id, result.sessionId)).run();
    }

    return null;
  }

  db.update(sessions)
    .set({
      lastSeenAt: new Date(),
    })
    .where(eq(sessions.id, result.sessionId))
    .run();

  return {
    sessionId: result.sessionId,
    user: result.user,
  };
});

export async function getCurrentSession() {
  return readCurrentSession();
}

export async function getCurrentUser() {
  const session = await readCurrentSession();

  return session?.user ?? null;
}

export async function listActiveSessionsByUserId(userId: string): Promise<ActiveSession[]> {
  return db
    .select({
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
      id: sessions.id,
      ip: sessions.ip,
      ipGeoCity: sessions.ipGeoCity,
      ipGeoCountry: sessions.ipGeoCountry,
      ipGeoRegion: sessions.ipGeoRegion,
      lastSeenAt: sessions.lastSeenAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .orderBy(asc(sessions.createdAt))
    .all()
    .map(mapActiveSession);
}

export async function terminateActiveSession(sessionId: string) {
  const currentSession = await readCurrentSession();

  if (!currentSession || sessionId === currentSession.sessionId) {
    return;
  }

  db.delete(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, currentSession.user.id),
        ne(sessions.id, currentSession.sessionId),
      ),
    )
    .run();
}

export async function requireAuth() {
  const session = await readCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session.user;
}

export function getDefaultRouteForRole(role: UserRole) {
  return role === "admin" ? "/users" : "/reports";
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth();

  if (user.role !== role) {
    redirect(getDefaultRouteForRole(user.role));
  }

  return user;
}

export async function login(loginValue: string, password: string) {
  const login = loginValue.trim().toLowerCase();
  const user = db.select().from(users).where(eq(users.login, login)).get();

  if (!user || !user.isActive) {
    return { error: "invalid-credentials" as LoginErrorCode };
  }

  const isPasswordValid = await verifyPassword(user.passwordHash, password);

  if (!isPasswordValid) {
    return { error: "invalid-credentials" as LoginErrorCode };
  }

  await createSession(user.id);

  return { error: null };
}

export async function logout() {
  const token = await readSessionToken();

  if (token) {
    await deleteSessionByToken(token);
  }

  await clearSessionCookie();
}

export async function createUserByAdmin(input: {
  displayName: string;
  login: string;
  password: string;
  role: UserRole;
}) {
  const displayName = input.displayName.trim();
  const login = input.login.trim().toLowerCase();
  const password = input.password.trim();

  if (!displayName || !login || !password) {
    return { error: "user-fields-required" as CreateUserErrorCode };
  }

  if (password.length < 8) {
    return { error: "password-too-short" as CreateUserErrorCode };
  }

  const existingUser = db.select().from(users).where(eq(users.login, login)).get();

  if (existingUser) {
    return { error: "user-login-exists" as CreateUserErrorCode };
  }

  const now = new Date();

  db.insert(users)
    .values({
      createdAt: now,
      displayName,
      id: crypto.randomUUID(),
      isActive: true,
      login,
      passwordHash: await hashPassword(password),
      role: input.role,
      updatedAt: now,
    })
    .run();

  return { error: null };
}

export async function listUsers() {
  return db.select().from(users).orderBy(desc(users.createdAt)).all();
}

export async function listUsersWithActiveSessions(): Promise<UserWithActiveSessions[]> {
  const rows = db
    .select({
      sessionCreatedAt: sessions.createdAt,
      sessionExpiresAt: sessions.expiresAt,
      sessionId: sessions.id,
      sessionIp: sessions.ip,
      sessionIpGeoCity: sessions.ipGeoCity,
      sessionIpGeoCountry: sessions.ipGeoCountry,
      sessionIpGeoRegion: sessions.ipGeoRegion,
      sessionLastSeenAt: sessions.lastSeenAt,
      user: users,
    })
    .from(users)
    .leftJoin(sessions, and(eq(sessions.userId, users.id), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(users.createdAt), asc(sessions.createdAt))
    .all();

  const usersById = new Map<string, UserWithActiveSessions>();

  for (const row of rows) {
    const existingUser =
      usersById.get(row.user.id) ??
      ({
        ...row.user,
        activeSessions: [],
      } satisfies UserWithActiveSessions);

    if (!usersById.has(row.user.id)) {
      usersById.set(row.user.id, existingUser);
    }

    if (row.sessionId && row.sessionCreatedAt && row.sessionExpiresAt && row.sessionLastSeenAt) {
      existingUser.activeSessions.push(
        mapActiveSession({
          createdAt: row.sessionCreatedAt,
          expiresAt: row.sessionExpiresAt,
          id: row.sessionId,
          ip: row.sessionIp,
          ipGeoCity: row.sessionIpGeoCity,
          ipGeoCountry: row.sessionIpGeoCountry,
          ipGeoRegion: row.sessionIpGeoRegion,
          lastSeenAt: row.sessionLastSeenAt,
        }),
      );
    }
  }

  return Array.from(usersById.values());
}
