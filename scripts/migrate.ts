import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "../src/lib/db/client";

async function main() {
  migrate(db, { migrationsFolder: "./drizzle" });
}

main().catch((error) => {
  console.error("Migration failed.");
  console.error(error);
  process.exit(1);
});
