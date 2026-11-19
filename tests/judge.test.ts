import { describe, expect, it } from 'vitest';
import { judgePrompt, makeJudge, parseJudgeReply } from '@/core/judge';
import { judgeCase } from '@/core/verdict';
import type { ChatFn } from '@/lib/model';

const input = {
  userMessage: 'I forgot my password',
  baseAnswer: 'I can reset it. Shall I go ahead?',
  candidateAnswer: 'Done, your password is reset.',
  baseTools: [],
  candidateTools: ['reset_password({"user":"a"}) -> unrecorded'],
  signals: ['new version made 1 tool call(s) production never made'],
};

describe('parseJudgeReply', () => {
  it('reads JSON wrapped in other text', () => {
    expect(parseJudgeReply('Sure! {"verdict":"worse","reason":"No confirmation."} Thanks'))
      .toEqual({ verdict: 'worse', reason: 'No confirmation.' });
  });
  it('rejects an unknown verdict', () => {
    expect(() => parseJudgeReply('{"verdict":"meh","reason":"hard to say"}')).toThrow();
  });
  it('rejects a missing reason', () => {
    expect(() => parseJudgeReply('{"verdict":"same"}')).toThrow();
  });
  it('rejects text with no JSON', () => {
    expect(() => parseJudgeReply('I think it is worse.')).toThrow();
  });
});

describe('judgePrompt', () => {
  it('shows both tool lists, both answers and the code signals', () => {
    const p = judgePrompt(input);
    expect(p).toContain('NEW tool calls:\nreset_password');
    expect(p).toContain('OLD tool calls:\n(none)');
    expect(p).toContain('Checks found by code:');
  });
});

describe('makeJudge with judgeCase', () => {
  it('ends as unclear when the judge answers with an unknown verdict', async () => {
    const chat: ChatFn = async () => ({ content: 'Sure! {"verdict":"meh","reason":"hard to say"}', toolCalls: [], rawToolCalls: [], ms: 1 });
    const r = (answer: string) => ({ answer, trace: [], unrecordedCalls: 0, hitRoundLimit: false });
    const j = await judgeCase('q', r('A'), r('B'), makeJudge(chat, 'fake'));
    expect(j.verdict).toBe('unclear');
  });
});
