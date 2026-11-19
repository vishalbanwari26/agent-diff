import { describe, expect, it } from 'vitest';
import { MAX_ROUNDS, runVersion, type Version } from '@/core/replay';
import type { ChatFn, ChatReply, ChatRequest } from '@/lib/model';

const version: Version = { model: 'fake', systemPrompt: 'You are the helpdesk agent.', tools: [] };
const recorded = { lookup_user: [{ args: { email: 'a@example.com' }, result: { locked: true } }] };

// A fake model that plays back scripted replies and remembers what it was sent.
function script(replies: Partial<ChatReply>[]) {
  const seen: ChatRequest[] = [];
  let i = 0;
  const chat: ChatFn = async (req) => {
    seen.push(structuredClone(req));
    const r = replies[Math.min(i++, replies.length - 1)]!;
    return { content: '', toolCalls: [], rawToolCalls: [], ms: 1, ...r };
  };
  return { chat, seen };
}
const call = (id: string, name: string, args: Record<string, unknown>) => ({ id, name, args });

describe('runVersion', () => {
  it('returns the first reply when no tools are called', async () => {
    const { chat } = script([{ content: 'Restart the router.' }]);
    const r = await runVersion(version, 'wifi is down', recorded, chat);
    expect(r).toMatchObject({ answer: 'Restart the router.', hitRoundLimit: false, unrecordedCalls: 0 });
    expect(r.trace).toHaveLength(1);
  });

  it('answers tool calls from the recording and sends the result back', async () => {
    const { chat, seen } = script([
      { toolCalls: [call('c1', 'lookup_user', { email: 'a@example.com' })] },
      { content: 'Your account is locked.' },
    ]);
    const r = await runVersion(version, 'cannot log in', recorded, chat);
    expect(r.answer).toBe('Your account is locked.');
    expect(r.trace.map((s) => s.kind)).toEqual(['model', 'tool', 'model']);
    const toolMsg = seen[1]!.messages.at(-1);
    expect(toolMsg).toEqual({ role: 'tool', tool_call_id: 'c1', content: JSON.stringify({ locked: true }) });
  });

  it('counts tool calls production never recorded', async () => {
    const { chat } = script([
      { toolCalls: [call('c1', 'reset_password', { user: 'a' })] },
      { content: 'Done, I reset it.' },
    ]);
    const r = await runVersion(version, 'cannot log in', recorded, chat);
    expect(r.unrecordedCalls).toBe(1);
  });

  it('stops after MAX_ROUNDS with an empty answer and the limit flag', async () => {
    const { chat, seen } = script([{ toolCalls: [call('c', 'lookup_user', { email: 'a@example.com' })] }]);
    const r = await runVersion(version, 'loop', recorded, chat);
    expect(r).toMatchObject({ answer: '', hitRoundLimit: true });
    expect(seen).toHaveLength(MAX_ROUNDS);
  });

  it('does not count read-only lookups as unrecorded', async () => {
    const { chat } = script([
      { toolCalls: [call('c1', 'search_kb', { query: 'new words' }), call('c2', 'create_ticket', { summary: 'x' })] },
      { content: 'Opened a ticket.' },
    ]);
    const r = await runVersion(version, 'q', recorded, chat, { search_kb: () => [] });
    expect(r.trace.filter((s) => s.kind === 'tool').map((s) => s.kind === 'tool' && s.answer.kind)).toEqual(['read', 'unrecorded']);
    expect(r.unrecordedCalls).toBe(1);
  });
});
