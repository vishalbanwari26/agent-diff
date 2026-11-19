// The replay queue: one BullMQ job per replay case.
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { loadEnv } from './env';

export const QUEUE = 'replay';
export type ReplayJob = { caseId: string };

export function redisConnection(): Redis {
  loadEnv();
  return new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6380', { maxRetriesPerRequest: null });
}

export function replayQueue(): Queue<ReplayJob> {
  return new Queue<ReplayJob>(QUEUE, { connection: redisConnection() });
}
