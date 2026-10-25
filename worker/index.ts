import { Worker } from "bullmq";
import { processSyncCourse } from "./jobs/syncCourse";

function getRedisConnectionOptions() {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(redisUrl);

  return {
    host: parsed.hostname || "localhost",
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  };
}

console.log("🚀 Starting BullMQ worker process...");

export const driveWorker = new Worker(
  "drive",
  async (job) => {
    console.log(`[Job Start] ${job.name} (id: ${job.id})`);

    if (job.name === "syncCourse") {
      return await processSyncCourse(job.data);
    }

    throw new Error(`Job desconhecido: ${job.name}`);
  },
  {
    connection: getRedisConnectionOptions(),
    concurrency: 2,
  },
);

driveWorker.on("completed", (job) => {
  console.log(`[Job Completed] ${job.name} (id: ${job.id})`);
});

driveWorker.on("failed", (job, err) => {
  console.error(`[Job Failed] ${job?.name} (id: ${job?.id}):`, err);
});
