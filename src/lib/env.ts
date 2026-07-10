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

function resolveOptionalApiGatewayUrl() {
  const value = process.env.API_GATEWAY_URL?.trim();

  return value ? value : null;
}

function resolveOptionalSourcesGoogleSheetUrl() {
  const value = process.env.SOURCES_GOOGLE_SHEET_URL?.trim();

  return value ? value : null;
}

export const env = {
  apiGatewayUrl: resolveOptionalApiGatewayUrl(),
  authSecret: resolveAuthSecret(),
  databasePath: process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
  isProduction: process.env.NODE_ENV === "production",
  sourcesGoogleSheetUrl: resolveOptionalSourcesGoogleSheetUrl(),
  youtubeApiKey: process.env.YOUTUBE_API_KEY?.trim() ?? "",
};
