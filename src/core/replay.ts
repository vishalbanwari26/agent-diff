// Replays one conversation through one agent version: the model may call tools
// for a few rounds, every call is answered from the recording, and every step
// is kept for the side-by-side view.
import { answerToolCall, type ReadOnlyTools, type Recorded, type ToolAnswer } from './replay-tools';
import type { ChatFn, ChatMessage, ModelToolCall, ToolDef } from '@/lib/model';

export type Version = { model: string; systemPrompt: string; tools: ToolDef[] };
export type TraceStep =
  | { kind: 'model'; content: string; toolCalls: ModelToolCall[]; ms: number }
  | { kind: 'tool'; call: ModelToolCall; answer: ToolAnswer };
export type ReplayResult = { answer: string; trace: TraceStep[]; unrecordedCalls: number; hitRoundLimit: boolean };

export const MAX_ROUNDS = 6;

export async function runVersion(
  version: Version, userMessage: string, recorded: Recorded, chat: ChatFn, readOnly: ReadOnlyTools = {},
): Promise<ReplayResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: version.systemPrompt },
    { role: 'user', content: userMessage },
  ];
  const trace: TraceStep[] = [];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const reply = await chat({ model: version.model, messages, tools: version.tools });
    trace.push({ kind: 'model', content: reply.content, toolCalls: reply.toolCalls, ms: reply.ms });
    if (reply.toolCalls.length === 0) return finish(reply.content, trace, false);
    messages.push({ role: 'assistant', content: reply.content, tool_calls: reply.rawToolCalls });
    for (const call of reply.toolCalls) {
      const answer = answerToolCall(call, recorded, readOnly);
      trace.push({ kind: 'tool', call, answer });
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(answer.result) });
    }
  }
  return finish('', trace, true);
}

function finish(answer: string, trace: TraceStep[], hitRoundLimit: boolean): ReplayResult {
  const unrecordedCalls = trace.filter((s) => s.kind === 'tool' && s.answer.kind === 'unrecorded').length;
  return { answer, trace, unrecordedCalls, hitRoundLimit };
}
