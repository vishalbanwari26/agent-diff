import type { Verdict } from '@/core/verdict';
import type { CaseStatus, CheckStatus, Counts } from '@/data/types';

export type Tone = Verdict | 'failed' | 'pending';

export const TONE: Record<Tone, { label: string; fg: string; bg: string; dot: string }> = {
  worse: { label: 'Worse', fg: 'text-worse', bg: 'bg-worse-soft', dot: 'bg-worse' },
  unclear: { label: 'Unclear', fg: 'text-unclear', bg: 'bg-unclear-soft', dot: 'bg-unclear' },
  failed: { label: 'Failed', fg: 'text-failed', bg: 'bg-failed-soft', dot: 'bg-failed' },
  better: { label: 'Better', fg: 'text-better', bg: 'bg-better-soft', dot: 'bg-better' },
  same: { label: 'Same', fg: 'text-same', bg: 'bg-same-soft', dot: 'bg-same' },
  pending: { label: 'Replaying', fg: 'text-accent', bg: 'bg-accent-soft', dot: 'bg-accent' },
};

export function toneOf(c: { status: CaseStatus; verdict: Verdict | null }): Tone {
  if (c.status === 'failed') return 'failed';
  if (c.status !== 'done' || !c.verdict) return 'pending';
  return c.verdict;
}

export function VerdictBadge({ tone, className = '' }: { tone: Tone; className?: string }) {
  const t = TONE[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ${t.fg} ${t.bg} ${className}`}>
      <span className={`size-1.5 rounded-full ${t.dot} ${tone === 'pending' ? 'pulse-dot' : ''}`} />
      {t.label}
    </span>
  );
}

const STATUS: Record<CheckStatus, { label: string; cls: string }> = {
  running: { label: 'Replaying', cls: 'text-accent bg-accent-soft' },
  ready: { label: 'Awaiting decision', cls: 'text-unclear bg-unclear-soft' },
  approved: { label: 'Approved', cls: 'text-better bg-better-soft' },
  blocked: { label: 'Blocked', cls: 'text-worse bg-worse-soft' },
};

export function StatusPill({ status }: { status: CheckStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${s.cls}`}>
      <span className={`size-1.5 rounded-full bg-current ${status === 'running' ? 'pulse-dot' : ''}`} />
      {s.label}
    </span>
  );
}

const ORDER: Tone[] = ['worse', 'unclear', 'failed', 'better', 'same', 'pending'];

export function StackedBar({ counts, total, height = 'h-1.5' }: { counts: Counts; total: number; height?: string }) {
  return (
    <div className={`flex ${height} w-full gap-px overflow-hidden rounded-full bg-hover`}>
      {ORDER.filter((k) => counts[k] > 0).map((k) => (
        <div key={k} className={TONE[k].dot} style={{ width: `${(counts[k] / Math.max(total, 1)) * 100}%` }} title={`${TONE[k].label}: ${counts[k]}`} />
      ))}
    </div>
  );
}

export function Legend({ counts }: { counts: Counts }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {ORDER.filter((k) => counts[k] > 0).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-muted">
          <span className={`size-2 rounded-sm ${TONE[k].dot}`} />
          {TONE[k].label} <span className="font-medium text-fg tabular-nums">{counts[k]}</span>
        </span>
      ))}
    </div>
  );
}

export function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[11.5px]">{children}</span>;
}
