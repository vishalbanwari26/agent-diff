'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, FileDiff, MessageSquare, RotateCw, TriangleAlert } from 'lucide-react';
import type { CaseView, CheckView } from '@/data/types';
import { countCases } from '@/data/summary';
import { lineDiff } from '@/lib/line-diff';
import { Legend, StackedBar, StatusPill, TONE, VerdictBadge, toneOf, type Tone } from './primitives';
import { Trace, toolCalls } from './trace';
import { DecisionPanel } from './decision';
import { timeAgo } from './time';
import { Answer } from './answer';

const isStatic = process.env['NEXT_PUBLIC_STATIC'] === '1';
type Filter = 'review' | 'failed' | 'changed' | 'all';
const RANK: Record<Tone, number> = { worse: 0, unclear: 1, failed: 2, pending: 3, better: 4, same: 5 };

function inFilter(c: CaseView, f: Filter) {
  const t = toneOf(c);
  if (f === 'review') return t === 'worse' || t === 'unclear';
  if (f === 'failed') return t === 'failed';
  if (f === 'changed') return t !== 'same';
  return true;
}

export function Report({ check }: { check: CheckView }) {
  const router = useRouter();
  const counts = countCases(check.cases);
  const review = counts.worse + counts.unclear;
  const [filter, setFilter] = useState<Filter>(review > 0 ? 'review' : 'all');
  const visible = useMemo(
    () => check.cases.filter((c) => inFilter(c, filter)).sort((a, b) => RANK[toneOf(a)] - RANK[toneOf(b)]),
    [check.cases, filter],
  );
  const [selectedId, setSelectedId] = useState<string | null>(visible[0]?.id ?? null);
  const selected = check.cases.find((c) => c.id === selectedId) ?? visible[0] ?? null;

  // Live app: refresh while cases are still replaying.
  useEffect(() => {
    if (isStatic || check.status !== 'running') return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [check.status, router]);

  // j / k move through the list.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('textarea,input')) return;
      if (e.key !== 'j' && e.key !== 'k') return;
      const i = visible.findIndex((c) => c.id === selected?.id);
      const next = visible[Math.min(visible.length - 1, Math.max(0, i + (e.key === 'j' ? 1 : -1)))];
      if (next) setSelectedId(next.id);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, selected]);

  const tabs: { id: Filter; label: string; n: number }[] = [
    { id: 'review', label: 'Needs review', n: review },
    { id: 'failed', label: 'Failed', n: counts.failed },
    { id: 'changed', label: 'Changed', n: check.cases.length - counts.same },
    { id: 'all', label: 'All', n: check.cases.length },
  ];

  return (
    <div className="space-y-5">
      <Header check={check} />
      <Summary check={check} />
      <PromptChanges check={check} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-line px-3 py-2">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => { setFilter(t.id); setSelectedId(null); }}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${filter === t.id ? 'bg-hover text-fg' : 'text-muted hover:text-fg'}`}>
                {t.label}
                <span className={`rounded px-1 text-[11px] tabular-nums ${filter === t.id ? 'bg-panel text-fg' : 'text-faint'}`}>{t.n}</span>
              </button>
            ))}
            <span className="ml-auto hidden shrink-0 pr-1 text-[11.5px] text-faint lg:block">
              <kbd className="rounded border border-line px-1 font-mono">j</kbd> <kbd className="rounded border border-line px-1 font-mono">k</kbd> to move
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
            <CaseList cases={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
            <div className="min-w-0 border-t border-line lg:border-t-0 lg:border-l">
              {selected ? <CaseDetail c={selected} check={check} /> : <Empty />}
            </div>
          </div>
        </div>
        <aside className="space-y-5 xl:sticky xl:top-[68px] xl:self-start">
          <DecisionPanel check={check} />
          <HowItWorks check={check} />
        </aside>
      </div>
    </div>
  );
}

function Header({ check }: { check: CheckView }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-x-2 text-muted">
          <span>{check.agentName}</span><span className="text-faint">·</span><span>Release check</span>
          {check.label && <><span className="text-faint">·</span><span>{check.label}</span></>}
        </div>
        <h1 className="flex flex-wrap items-center gap-2.5 text-[22px] font-semibold tracking-tight">
          <span className="rounded-md border border-line bg-panel px-2 py-0.5 font-mono text-[15px] text-muted">{check.base.label}</span>
          <span className="text-faint">→</span>
          <span className="rounded-md border border-accent/40 bg-accent-soft px-2 py-0.5 font-mono text-[15px] text-accent">{check.candidate.label}</span>
          <StatusPill status={check.status} />
        </h1>
      </div>
      <dl className="hidden grid-cols-3 gap-x-6 gap-y-1 text-[12px] sm:grid">
        <dt className="text-faint">Conversations</dt><dt className="text-faint">Model</dt><dt className="text-faint">Started</dt>
        <dd className="font-medium tabular-nums">{check.cases.length}</dd>
        <dd className="font-mono text-[11.5px]">{check.candidate.model}</dd>
        <dd>{timeAgo(check.createdAt)}</dd>
      </dl>
    </div>
  );
}

function Summary({ check }: { check: CheckView }) {
  const c = countCases(check.cases);
  const tiles: { label: string; n: number; tone: Tone; hint: string }[] = [
    { label: 'Worse', n: c.worse, tone: 'worse', hint: 'The new version does something the old one would not' },
    { label: 'Unclear', n: c.unclear, tone: 'unclear', hint: 'Code saw a new action or the judge could not decide' },
    { label: 'Better', n: c.better, tone: 'better', hint: 'Different, and the judge prefers the new answer' },
    { label: 'Same', n: c.same, tone: 'same', hint: 'Same answer or same substance' },
  ];
  return (
    <div className="card p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-line bg-panel-2 px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-muted"><span className={`size-2 rounded-sm ${TONE[t.tone].dot}`} />{t.label}</div>
            <div className="mt-1 text-[24px] font-semibold tabular-nums tracking-tight">{t.n}</div>
            <div className="text-[11.5px] leading-snug text-faint">{t.hint}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <StackedBar counts={c} total={check.cases.length} height="h-2" />
        <Legend counts={c} />
      </div>
    </div>
  );
}

function PromptChanges({ check }: { check: CheckView }) {
  const [open, setOpen] = useState(false);
  const diff = lineDiff(check.base.systemPrompt, check.candidate.systemPrompt);
  const removed = diff.filter((d) => d.kind === 'removed').length;
  const added = diff.filter((d) => d.kind === 'added').length;
  const modelChanged = check.base.model !== check.candidate.model;
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-3 text-left hover:bg-hover">
        <FileDiff size={15} className="text-muted" />
        <span className="font-medium">What changed in {check.candidate.label}</span>
        <span className="text-muted">System prompt <span className="text-better">+{added}</span> <span className="text-worse">−{removed}</span> lines{modelChanged ? ', model changed' : ', same model and tools'}</span>
        <ChevronDown size={15} className={`ml-auto hidden text-faint transition sm:block ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="scroll-thin max-h-[360px] overflow-auto border-t border-line bg-panel-2 py-2 font-mono text-[12px] leading-[1.6]">
          {diff.map((d, i) => (
            <div key={i} className={`flex gap-3 px-4 ${d.kind === 'removed' ? 'bg-worse-soft text-worse' : d.kind === 'added' ? 'bg-better-soft text-better' : 'text-muted'}`}>
              <span className="w-3 shrink-0 select-none text-faint">{d.kind === 'removed' ? '−' : d.kind === 'added' ? '+' : ''}</span>
              <span className="whitespace-pre-wrap">{d.text || ' '}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CaseList({ cases, selectedId, onSelect }: { cases: CaseView[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (cases.length === 0) return <p className="px-4 py-8 text-center text-muted">Nothing here.</p>;
  return (
    <ul className="scroll-thin max-h-[300px] overflow-y-auto lg:max-h-[720px]">
      {cases.map((c) => {
        const active = c.id === selectedId;
        return (
          <li key={c.id}>
            <button onClick={() => onSelect(c.id)}
              className={`relative flex w-full flex-col gap-1 border-b border-line px-4 py-3 text-left transition ${active ? 'bg-hover' : 'hover:bg-hover/60'}`}>
              {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{c.title}</span>
                <VerdictBadge tone={toneOf(c)} />
              </span>
              <span className="line-clamp-1 text-muted">{c.message}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CaseDetail({ c, check }: { c: CaseView; check: CheckView }) {
  const tone = toneOf(c);
  const baseCalls = toolCalls(c.baseTrace);
  const candCalls = toolCalls(c.candidateTrace);
  const baseKeys = new Set(baseCalls.map((t) => t.key));
  const candKeys = new Set(candCalls.map((t) => t.key));
  const dropped = baseCalls.filter((t) => !candKeys.has(t.key));
  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight">{c.title}</h2>
        <VerdictBadge tone={tone} />
        {c.attempts > 1 && <span className="text-[11.5px] text-faint">attempt {c.attempts}</span>}
      </div>

      <div className="mb-4 flex gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-hover text-muted"><MessageSquare size={13} /></span>
        <div className="rounded-xl rounded-tl-sm border border-line bg-panel-2 px-3.5 py-2.5">{c.message}</div>
      </div>

      {(c.reason || c.error) && (
        <div className={`mb-5 rounded-lg border-l-2 px-3.5 py-2.5 ${TONE[tone].bg}`} style={{ borderColor: `var(--${tone === 'pending' ? 'accent' : tone})` }}>
          <div className={`mb-0.5 text-[11.5px] font-semibold uppercase tracking-wide ${TONE[tone].fg}`}>
            {c.error ? 'Replay failed' : c.reason?.startsWith('Identical') ? 'Checked by code' : 'Why'}
          </div>
          <div>{c.error ?? c.reason}</div>
          {c.error && <RetryButton caseId={c.id} />}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Side title={check.base.label} sub="current" answer={c.baseAnswer} trace={c.baseTrace} otherKeys={candKeys} />
        <Side title={check.candidate.label} sub="candidate" accent answer={c.candidateAnswer} trace={c.candidateTrace} otherKeys={baseKeys}
          dropped={dropped.map((d) => d.name)} />
      </div>
    </div>
  );
}

function Side(p: { title: string; sub: string; accent?: boolean; answer: string | null; trace: CaseView['baseTrace']; otherKeys: Set<string>; dropped?: string[] }) {
  return (
    <section className={`rounded-xl border ${p.accent ? 'border-accent/30' : 'border-line'} bg-panel-2`}>
      <header className="flex items-center gap-2 border-b border-line px-3.5 py-2">
        <span className={`font-mono text-[12px] font-semibold ${p.accent ? 'text-accent' : 'text-muted'}`}>{p.title}</span>
        <span className="text-[11.5px] text-faint">{p.sub}</span>
      </header>
      <div className="space-y-4 p-3.5">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">Answer</div>
          {p.answer ? <Answer text={p.answer} /> : <span className="text-faint italic">No final answer</span>}
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">Steps</div>
          <Trace trace={p.trace} otherKeys={p.otherKeys} />
          {p.dropped && p.dropped.length > 0 && (
            <div className="mt-2.5 flex items-start gap-2 rounded-md bg-worse-soft px-2.5 py-1.5 text-worse">
              <TriangleAlert size={13} className="mt-0.5 shrink-0" />
              <span>Did not make {p.dropped.length === 1 ? 'a call' : 'calls'} the current version made: <span className="font-mono text-[11.5px]">{p.dropped.join(', ')}</span></span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RetryButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (isStatic) return null;
  return (
    <button disabled={busy} onClick={async () => { setBusy(true); await fetch(`/api/cases/${caseId}/retry`, { method: 'POST' }); router.refresh(); setBusy(false); }}
      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-panel px-2.5 py-1 font-medium hover:bg-hover disabled:opacity-50">
      <RotateCw size={12} className={busy ? 'animate-spin' : ''} /> Retry this case
    </button>
  );
}

function HowItWorks({ check }: { check: CheckView }) {
  const noJudge = check.cases.filter((c) => c.reason?.startsWith('Identical')).length;
  const unrecorded = check.cases.filter((c) => toolCalls(c.candidateTrace).length && c.candidateTrace?.some((s) => s.kind === 'tool' && s.answer.kind === 'unrecorded')).length;
  return (
    <div className="card p-4 text-muted">
      <div className="mb-2 font-medium text-fg">How this check ran</div>
      <ul className="space-y-1.5">
        <li>Each conversation was replayed through <span className="font-mono text-[11.5px] text-fg">{check.base.label}</span> and <span className="font-mono text-[11.5px] text-fg">{check.candidate.label}</span>.</li>
        <li>Tools answered from production recordings. New read-only lookups used a read-only source. No real system was changed.</li>
        <li><span className="font-medium text-fg tabular-nums">{noJudge}</span> cases were settled as same by code, with no judge call.</li>
        <li><span className="font-medium text-fg tabular-nums">{unrecorded}</span> cases took an action production never took. Those can never pass as same.</li>
      </ul>
    </div>
  );
}

function Empty() {
  return <div className="grid h-full min-h-[240px] place-items-center text-muted">Select a conversation</div>;
}
