// Records "production": runs v1 on every sample conversation against the fake
// backend and saves each tool call with its result to fixtures/recordings.json.
// Run once; replays later answer from this file and never call the backend.
import { writeFileSync } from 'node:fs';
import { CASES, TOOLS, V1_PROMPT, fakeBackend } from '../fixtures/helpdesk';
import { groqChat, type ChatMessage } from '@/lib/model';
import { AGENT_MODEL } from '@/lib/models';
import type { Recorded } from '@/core/replay-tools';

async function record(message: string): Promise<{ recorded: Recorded; answer: string }> {
  const recorded: Recorded = {};
  const messages: ChatMessage[] = [{ role: 'system', content: V1_PROMPT }, { role: 'user', content: message }];
  for (let round = 0; round < 6; round++) {
    const reply = await groqChat({ model: AGENT_MODEL, messages, tools: TOOLS });
    if (reply.toolCalls.length === 0) return { recorded, answer: reply.content };
    messages.push({ role: 'assistant', content: reply.content, tool_calls: reply.rawToolCalls });
    for (const c of reply.toolCalls) {
      const result = fakeBackend(c.name, c.args);
      (recorded[c.name] ??= []).push({ args: c.args, result });
      messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(result) });
    }
  }
  return { recorded, answer: '' };
}

const out = [];
for (const [i, c] of CASES.entries()) {
  const r = await record(c.message);
  out.push({ title: c.title, ...r });
  console.log(`${i + 1}/${CASES.length} ${c.title}: ${Object.keys(r.recorded).join(', ') || 'no tools'}`);
}
writeFileSync('fixtures/recordings.json', JSON.stringify({ model: AGENT_MODEL, recordedAt: new Date().toISOString(), cases: out }, null, 2));
