// What the pages show. Plain JSON, so the same shapes come from Postgres in the
// app and from fixtures/snapshot.json in the static demo.
import type { TraceStep } from '@/core/replay';
import type { Verdict } from '@/core/verdict';

export type CaseStatus = 'queued' | 'running' | 'done' | 'failed';
export type CheckStatus = 'running' | 'ready' | 'approved' | 'blocked';
export type VersionView = { label: string; model: string; systemPrompt: string };

export type CaseView = {
  id: string;
  title: string;
  message: string;
  status: CaseStatus;
  verdict: Verdict | null;
  reason: string | null;
  error: string | null;
  attempts: number;
  baseAnswer: string | null;
  candidateAnswer: string | null;
  baseTrace: TraceStep[] | null;
  candidateTrace: TraceStep[] | null;
};

export type CheckView = {
  id: string;
  agentName: string;
  base: VersionView;
  candidate: VersionView;
  status: CheckStatus;
  label: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  cases: CaseView[];
};

export type Counts = Record<Verdict | 'failed' | 'pending', number>;
export type CheckSummary = Omit<CheckView, 'cases' | 'base' | 'candidate'> & {
  baseLabel: string;
  candidateLabel: string;
  model: string;
  counts: Counts;
  total: number;
};
