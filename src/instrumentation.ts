export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startRedisSub } = await import("./lib/redis/redis-sub");
    startRedisSub();
  }
}
