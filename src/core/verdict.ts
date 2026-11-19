// Decides what changed in one replay case. Code decides what it can see for
// itself; the judge model only weighs answers that really differ; and anything
// the code cannot vouch for ends as 'unclear', never as 'same'.
import type { ReplayResult } from './replay';

export type Verdict = 'same' | 'better' | 'worse' | 'unclear';
export type Judged = { verdict: Verdict; reason: string; judgeUsed: boolean };
export type JudgeInput = {
  userMessage: string;
  baseAnswer: string;
  candidateAnswer: string;
  baseTools: string[];
  candidateTools: string[];
  signals: string[];
};
export type JudgeFn = (input: JudgeInput) => Promise<{ verdict: Verdict; reason: string }>;

export function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Behaviour changes code can see without a model.
export function hardSignals(base: ReplayResult, cand: ReplayResult): string[] {
  const s: string[] = [];
  if (cand.hitRoundLimit && !base.hitRoundLimit) s.push('new version never finished (round limit)');
  if (cand.unrecordedCalls > base.unrecordedCalls)
    s.push(`new version made ${cand.unrecordedCalls - base.unrecordedCalls} tool call(s) production never made`);
  return s;
}

export function toolSummary(r: ReplayResult): string[] {
  return r.trace.flatMap((s) =>
    s.kind === 'tool' ? [`${s.call.name}(${JSON.stringify(s.call.args)}) -> ${s.answer.kind}`] : [],
  );
}

export async function judgeCase(userMessage: string, base: ReplayResult, cand: ReplayResult, judge: JudgeFn): Promise<Judged> {
  const signals = hardSignals(base, cand);
  if (signals.length === 0 && normalise(base.answer) === normalise(cand.answer))
    return { verdict: 'same', reason: 'Identical answer and no new tool behaviour.', judgeUsed: false };
  try {
    const j = await judge({
      userMessage, baseAnswer: base.answer, candidateAnswer: cand.answer,
      baseTools: toolSummary(base), candidateTools: toolSummary(cand), signals,
    });
    // A behaviour change found by code can never be waved through by the judge.
    if (signals.length > 0 && (j.verdict === 'same' || j.verdict === 'better'))
      return { verdict: 'unclear', reason: `Judge said ${j.verdict}, but ${signals.join('; ')}.`, judgeUsed: true };
    return { ...j, judgeUsed: true };
  } catch (e) {
    return { verdict: 'unclear', reason: `Judge failed: ${(e as Error).message}`, judgeUsed: true };
  }
}
