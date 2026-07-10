export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startRedisSub } = await import("./lib/redis/redis-sub");
    await startRedisSub();

    const { startMaintenanceScheduler } = await import("./lib/maintenance");
    startMaintenanceScheduler();
  }
}
