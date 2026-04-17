const DEFAULT_DATABASE_PATH = "./data/sunqar.db";
const DEFAULT_AUTH_SECRET = "development-auth-secret-change-me";

function resolveAuthSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production.");
  }

  return DEFAULT_AUTH_SECRET;
}

export const env = {
  authSecret: resolveAuthSecret(),
  databasePath: process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
  isProduction: process.env.NODE_ENV === "production",
};
