import Link from 'next/link';
import { ArrowRight, GitCompareArrows } from 'lucide-react';
import { listChecks } from '@/data/source';
import { Shell } from '@/ui/shell';
import { Legend, StackedBar, StatusPill } from '@/ui/primitives';
import { timeAgo } from '@/ui/time';


export default async function Home() {
  const checks = await listChecks();
  return (
    <Shell crumbs={[{ label: 'Release checks' }]}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Release checks</h1>
          <p className="mt-1 max-w-[640px] text-muted">
            Before a new agent version ships, real past conversations are replayed through both versions. Tools answer
            from recordings, so nothing reaches a real system. Only the answers that changed need your attention.
          </p>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,2.4fr)_140px_110px_24px] gap-6 border-b border-line px-5 py-2.5 text-[11.5px] font-medium uppercase tracking-wide text-faint md:grid">
          <span>Agent and versions</span><span>Result</span><span>Status</span><span>Started</span><span />
        </div>
        {checks.length === 0 && <p className="px-5 py-10 text-center text-muted">No release checks yet. Run <code>npm run check</code>.</p>}
        {checks.map((c) => (
          <Link key={c.id} href={`/checks/${c.id}`}
            className="group grid grid-cols-1 gap-3 border-b border-line px-5 py-4 last:border-0 hover:bg-hover md:grid-cols-[minmax(0,2fr)_minmax(0,2.4fr)_140px_110px_24px] md:items-center md:gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-panel-2 text-muted">
                <GitCompareArrows size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 truncate font-medium">
                  {c.agentName}
                  {c.label && <span className="rounded border border-line px-1.5 text-[11px] font-normal text-muted">{c.label}</span>}
                </div>
                <div className="text-muted">
                  <span className="font-mono text-[11.5px]">{c.baseLabel}</span> → <span className="font-mono text-[11.5px] text-fg">{c.candidateLabel}</span>
                  <span className="text-faint"> · {c.total} conversations · {c.model}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <StackedBar counts={c.counts} total={c.total} />
              <Legend counts={c.counts} />
            </div>
            <div><StatusPill status={c.status} /></div>
            <div className="text-muted">{timeAgo(c.createdAt)}</div>
            <ArrowRight size={15} className="hidden text-faint transition group-hover:translate-x-0.5 group-hover:text-fg md:block" />
          </Link>
        ))}
      </div>
    </Shell>
  );
}
