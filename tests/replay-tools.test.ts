import { describe, expect, it } from 'vitest';
import { answerToolCall, canonical, type Recorded } from '@/core/replay-tools';

const recorded: Recorded = {
  lookup_user: [{ args: { email: 'j.doe@example.com' }, result: { id: 'u1', locked: true } }],
  search_kb: [
    { args: { query: 'vpn', limit: 3 }, result: ['VPN setup'] },
    { args: { query: 'printer', limit: 3 }, result: ['Printer drivers'] },
  ],
};

describe('canonical', () => {
  it('ignores key order', () => {
    expect(canonical({ a: 1, b: { c: 2, d: 3 } })).toBe(canonical({ b: { d: 3, c: 2 }, a: 1 }));
  });
  it('keeps array order', () => {
    expect(canonical([1, 2])).not.toBe(canonical([2, 1]));
  });
});

describe('answerToolCall', () => {
  it('returns the recorded result for the same arguments', () => {
    const a = answerToolCall({ name: 'lookup_user', args: { email: 'j.doe@example.com' } }, recorded);
    expect(a).toEqual({ kind: 'recorded', result: { id: 'u1', locked: true } });
  });
  it('matches arguments in any key order', () => {
    const a = answerToolCall({ name: 'search_kb', args: { limit: 3, query: 'printer' } }, recorded);
    expect(a).toEqual({ kind: 'recorded', result: ['Printer drivers'] });
  });
  it('acknowledges an unrecorded action without running it', () => {
    const a = answerToolCall({ name: 'reset_password', args: { user: 'j.doe' } }, recorded);
    expect(a.kind).toBe('unrecorded');
    expect(a.result).toMatchObject({ status: 'accepted', note: 'Replay: not executed, held for review.' });
  });
  it('gives the same id to the same call', () => {
    const call = { name: 'create_ticket', args: { summary: 'x', priority: 'normal' } };
    const a = answerToolCall(call, recorded).result as { id: string };
    const b = answerToolCall({ name: 'create_ticket', args: { priority: 'normal', summary: 'x' } }, recorded).result as { id: string };
    expect(a.id).toMatch(/^REPLAY-\d{6}$/);
    expect(a.id).toBe(b.id);
  });
  it('does not fall back to another call of the same tool', () => {
    const a = answerToolCall({ name: 'search_kb', args: { query: 'vpn', limit: 5 } }, recorded);
    expect(a.kind).toBe('unrecorded');
  });

  it('answers a read-only tool from the read source when nothing was recorded', () => {
    const readOnly = { search_kb: (args: Record<string, unknown>) => [`live result for ${args['query']}`] };
    const a = answerToolCall({ name: 'search_kb', args: { query: 'vpn from home' } }, recorded, readOnly);
    expect(a).toEqual({ kind: 'read', result: ['live result for vpn from home'] });
  });
  it('prefers the recording over the read source', () => {
    const readOnly = { search_kb: () => ['live'] };
    const a = answerToolCall({ name: 'search_kb', args: { query: 'vpn', limit: 3 } }, recorded, readOnly);
    expect(a.kind).toBe('recorded');
  });
  it('never answers a state-changing tool from the read source', () => {
    const readOnly = { search_kb: () => ['live'] };
    const a = answerToolCall({ name: 'create_ticket', args: { summary: 'x' } }, recorded, readOnly);
    expect(a.kind).toBe('unrecorded');
  });
});
