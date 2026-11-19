// Starts a release check (v1 -> v2 by default) and waits until it is ready.
// Needs the worker running: `npm run worker` in another terminal.
import { createPrismaClient } from '@/lib/prisma';
import { replayQueue } from '@/lib/queue';
import { createCheck } from '@/services/checks';

const [base = 'v1', candidate = 'v2', label] = process.argv.slice(2);
const db = createPrismaClient();
const queue = replayQueue();
const agent = await db.agent.findFirstOrThrow();
const check = await createCheck(db, queue, agent.id, base, candidate, label);
console.log(`check ${check.id}: ${check.cases.length} cases queued`);
for (;;) {
  await new Promise((r) => setTimeout(r, 3000));
  const counts = await db.replayCase.groupBy({ by: ['status'], where: { checkId: check.id }, _count: true });
  console.log(counts.map((c) => `${c.status} ${c._count}`).join(', '));
  if (!counts.some((c) => c.status === 'queued' || c.status === 'running')) break;
}
const verdicts = await db.replayCase.groupBy({ by: ['verdict'], where: { checkId: check.id }, _count: true });
console.log('verdicts:', verdicts.map((v) => `${v.verdict ?? 'none'} ${v._count}`).join(', '));
await queue.close();
await db.$disconnect();
