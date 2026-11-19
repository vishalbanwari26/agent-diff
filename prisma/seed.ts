// Loads the sample agent, its two versions and the recorded conversations.
import { existsSync, readFileSync } from 'node:fs';
import { CASES, TOOLS, V1_PROMPT, V2_PROMPT } from '../fixtures/helpdesk';
import { Prisma } from '@prisma/client';
import { createPrismaClient } from '@/lib/prisma';
import { AGENT_MODEL } from '@/lib/models';

if (!existsSync('fixtures/recordings.json')) throw new Error('Run `npm run record` first.');
const rec = JSON.parse(readFileSync('fixtures/recordings.json', 'utf8')) as { cases: { title: string; recorded: object }[] };
const db = createPrismaClient();

await db.$transaction([
  db.replayCase.deleteMany(), db.releaseCheck.deleteMany(), db.conversation.deleteMany(),
  db.agentVersion.deleteMany(), db.agent.deleteMany(),
]);
const agent = await db.agent.create({ data: { name: 'Brightmoor IT helpdesk' } });
await db.agentVersion.createMany({ data: [
  { agentId: agent.id, label: 'v1', model: AGENT_MODEL, systemPrompt: V1_PROMPT, tools: TOOLS as unknown as Prisma.InputJsonValue },
  { agentId: agent.id, label: 'v2', model: AGENT_MODEL, systemPrompt: V2_PROMPT, tools: TOOLS as unknown as Prisma.InputJsonValue },
] });
for (const c of CASES) {
  const r = rec.cases.find((x) => x.title === c.title);
  if (!r) throw new Error(`No recording for ${c.title}`);
  await db.conversation.create({ data: { agentId: agent.id, title: c.title, messages: [c.message], recordedTools: r.recorded } });
}
console.log(`Seeded ${CASES.length} conversations, versions v1 and v2.`);
await db.$disconnect();
