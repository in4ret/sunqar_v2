export function formatLogMessage(message: string) {
  return `[${new Date().toISOString()}] ${message}`;
}
