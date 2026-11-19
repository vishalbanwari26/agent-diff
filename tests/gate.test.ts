import { describe, expect, it } from 'vitest';
import { checkDecision, type CaseState } from '@/core/gate';

const done = (verdict: CaseState['verdict']): CaseState => ({ status: 'done', verdict });
const longNote = 'Policy changed on purpose: resets now need a manager.';

describe('checkDecision', () => {
  it('allows block while cases are still running', () => {
    expect(checkDecision([{ status: 'running', verdict: null }], { action: 'block' })).toEqual({ ok: true });
  });
  it('refuses approve while cases are running', () => {
    const r = checkDecision([done('same'), { status: 'queued', verdict: null }], { action: 'approve' });
    expect(r.ok).toBe(false);
  });
  it('refuses approve with a failed case, even with a long note', () => {
    const cases = [...Array(29)].map(() => done('same')).concat({ status: 'failed', verdict: null });
    const r = checkDecision(cases, { action: 'approve', note: longNote });
    expect(r).toEqual({ ok: false, reason: '1 case(s) failed to replay. Retry them first.' });
  });
  it('approves a clean run without a note', () => {
    expect(checkDecision([done('same'), done('better')], { action: 'approve' })).toEqual({ ok: true });
  });
  it('needs a note to approve with worse or unclear cases', () => {
    const cases = [done('same'), done('worse'), done('unclear')];
    expect(checkDecision(cases, { action: 'approve', note: 'fine' }).ok).toBe(false);
    expect(checkDecision(cases, { action: 'approve', note: longNote })).toEqual({ ok: true });
  });
  it('does not count whitespace toward the note', () => {
    expect(checkDecision([done('worse')], { action: 'approve', note: ' '.repeat(40) }).ok).toBe(false);
  });
});
