// Who may decide what, and when. A pure function: the API calls it before it
// writes any decision, so the rules live in one place and are easy to test.
import type { Verdict } from './verdict';

export type CaseState = { status: 'queued' | 'running' | 'done' | 'failed'; verdict: Verdict | null };
export type Decision = { action: 'approve' | 'block'; note?: string };
export type GateResult = { ok: true } | { ok: false; reason: string };

export const MIN_NOTE = 20;

export function checkDecision(cases: CaseState[], d: Decision): GateResult {
  // Stopping a release is always safe, so blocking is allowed at any time.
  if (d.action === 'block') return { ok: true };

  const pending = cases.filter((c) => c.status === 'queued' || c.status === 'running').length;
  if (pending > 0) return { ok: false, reason: `${pending} case(s) are still replaying.` };

  const failed = cases.filter((c) => c.status === 'failed').length;
  if (failed > 0) return { ok: false, reason: `${failed} case(s) failed to replay. Retry them first.` };

  const open = cases.filter((c) => c.verdict === 'worse' || c.verdict === 'unclear').length;
  if (open > 0 && (d.note ?? '').trim().length < MIN_NOTE)
    return { ok: false, reason: `${open} case(s) are worse or unclear. Approving needs a note of at least ${MIN_NOTE} characters saying why.` };

  return { ok: true };
}
