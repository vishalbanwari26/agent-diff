// The replay worker: takes one case at a time off the queue and replays it.
import { Worker } from 'bullmq';
import { createPrismaClient } from '@/lib/prisma';
import { groqChat } from '@/lib/model';
import { JUDGE_MODEL } from '@/lib/models';
import { QUEUE, redisConnection, type ReplayJob } from '@/lib/queue';
import { makeJudge } from '@/core/judge';
import { processCase } from '@/services/checks';
import { READ_ONLY } from '../fixtures/read-source';

const db = createPrismaClient();
const judge = makeJudge(groqChat, JUDGE_MODEL);
const concurrency = Number(process.env['REPLAY_CONCURRENCY'] ?? 2);

const worker = new Worker<ReplayJob>(QUEUE, (job) => processCase(db, job.data.caseId, groqChat, judge, READ_ONLY), {
  connection: redisConnection(),
  concurrency,
});
worker.on('completed', (job) => console.log(`replayed ${job.data.caseId}`));
worker.on('failed', (job, err) => console.error(`job ${job?.id} crashed: ${err.message}`));
console.log(`worker up, concurrency ${concurrency}`);
