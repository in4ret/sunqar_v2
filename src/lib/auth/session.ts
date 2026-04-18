import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";
import { SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "./constants";
import { getSessionClientInfo } from "./session-client-info";

function hashSessionToken(token: string) {
  return crypto
    .createHmac("sha256", env.authSecret)
    .update(token)
    .digest("hex");
}

function buildCookieOptions(expiresAt: Date) {
  return {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: env.isProduction,
  };
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  const headerStore = await headers();
  const clientInfo = await getSessionClientInfo(headerStore);

  db.insert(sessions)
    .values({
      createdAt: now,
      expiresAt,
      id: crypto.randomUUID(),
      ip: clientInfo.ip,
      ipGeoCity: clientInfo.ipGeo?.city ?? null,
      ipGeoCountry: clientInfo.ipGeo?.country ?? null,
      ipGeoRegion: clientInfo.ipGeo?.region ?? null,
      lastSeenAt: now,
      tokenHash,
      userId,
    })
    .run();

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, buildCookieOptions(expiresAt));
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function deleteSessionByToken(token: string) {
  const tokenHash = hashSessionToken(token);

  db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run();
}

export async function readSessionToken() {
  const cookieStore = await cookies();

  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function getSessionTokenHash(token: string) {
  return hashSessionToken(token);
}
