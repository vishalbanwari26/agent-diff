import { describe, expect, it, vi } from 'vitest';
import { hardSignals, judgeCase, type JudgeFn } from '@/core/verdict';
import type { ReplayResult } from '@/core/replay';

const result = (answer: string, extra: Partial<ReplayResult> = {}): ReplayResult => ({
  answer, trace: [], unrecordedCalls: 0, hitRoundLimit: false, ...extra,
});
const judgeSays = (verdict: 'same' | 'better' | 'worse' | 'unclear') =>
  vi.fn<JudgeFn>(async () => ({ verdict, reason: 'judge reason' }));

describe('judgeCase', () => {
  it('returns same without calling the judge for identical answers', async () => {
    const judge = judgeSays('worse');
    const j = await judgeCase('q', result('Restart the router.'), result('  restart the ROUTER. '), judge);
    expect(j).toMatchObject({ verdict: 'same', judgeUsed: false });
    expect(judge).not.toHaveBeenCalled();
  });

  it('asks the judge when answers differ', async () => {
    const j = await judgeCase('q', result('A'), result('B'), judgeSays('worse'));
    expect(j).toMatchObject({ verdict: 'worse', reason: 'judge reason', judgeUsed: true });
  });

  it('turns same into unclear when the new version made an unrecorded call', async () => {
    const j = await judgeCase('q', result('Done.'), result('Done.', { unrecordedCalls: 1 }), judgeSays('same'));
    expect(j.verdict).toBe('unclear');
    expect(j.reason).toContain('production never made');
  });

  it('turns better into unclear when the new version hit the round limit', async () => {
    const j = await judgeCase('q', result('A'), result('', { hitRoundLimit: true }), judgeSays('better'));
    expect(j.verdict).toBe('unclear');
  });

  it('keeps worse when there is a signal', async () => {
    const j = await judgeCase('q', result('A'), result('B', { unrecordedCalls: 1 }), judgeSays('worse'));
    expect(j.verdict).toBe('worse');
  });

  it('returns unclear when the judge fails', async () => {
    const judge = vi.fn<JudgeFn>(async () => { throw new Error('429'); });
    const j = await judgeCase('q', result('A'), result('B'), judge);
    expect(j).toMatchObject({ verdict: 'unclear', judgeUsed: true });
    expect(j.reason).toContain('429');
  });
});

describe('hardSignals', () => {
  it('ignores unrecorded calls the old version also made', () => {
    expect(hardSignals(result('A', { unrecordedCalls: 1 }), result('B', { unrecordedCalls: 1 }))).toEqual([]);
  });
});
