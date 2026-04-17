import crypto from "node:crypto";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, desc, eq, gt } from "drizzle-orm";
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

export async function requireAuth() {
  const session = await readCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session.user;
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth();

  if (user.role !== role) {
    redirect("/");
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
