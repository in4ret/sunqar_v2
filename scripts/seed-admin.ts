import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword } from "../src/lib/auth/password";
import { db } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";

function readArgument(index: number, envName: string) {
  return process.argv[index] ?? process.env[envName];
}

async function main() {
  const login = readArgument(2, "ADMIN_LOGIN")?.trim().toLowerCase();
  const password = readArgument(3, "ADMIN_PASSWORD");
  const displayName = readArgument(4, "ADMIN_DISPLAY_NAME")?.trim() ?? "Administrator";

  if (!login || !password) {
    console.error("Usage: npm run db:seed-admin -- <login> <password> [display-name]");
    process.exit(1);
  }

  const existingUser = db.select().from(users).where(eq(users.login, login)).get();

  if (existingUser) {
    console.error(`User with login "${login}" already exists.`);
    process.exit(1);
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
      role: "admin",
      updatedAt: now,
    })
    .run();

  console.log(`Admin user "${login}" created.`);
}

main().catch((error) => {
  console.error("Admin seed failed.");
  console.error(error);
  process.exit(1);
});
