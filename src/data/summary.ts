import type { CaseView, CheckSummary, CheckView, Counts } from './types';

export function countCases(cases: Pick<CaseView, 'status' | 'verdict'>[]): Counts {
  const c: Counts = { same: 0, better: 0, worse: 0, unclear: 0, failed: 0, pending: 0 };
  for (const k of cases) {
    if (k.status === 'failed') c.failed++;
    else if (k.status !== 'done' || !k.verdict) c.pending++;
    else c[k.verdict]++;
  }
  return c;
}

export function summarise(check: CheckView): CheckSummary {
  const { cases, base, candidate, ...rest } = check;
  return { ...rest, baseLabel: base.label, candidateLabel: candidate.label, model: candidate.model, counts: countCases(cases), total: cases.length };
}
