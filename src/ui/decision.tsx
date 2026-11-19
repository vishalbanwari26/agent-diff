'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Circle, ShieldCheck, ShieldX, X } from 'lucide-react';
import { checkDecision, MIN_NOTE } from '@/core/gate';
import type { CheckView } from '@/data/types';
import { countCases } from '@/data/summary';

const isStatic = process.env['NEXT_PUBLIC_STATIC'] === '1';
type Saved = { action: 'approve' | 'block'; note: string; at: string };

export function DecisionPanel({ check }: { check: CheckView }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<Saved | null>(null);
  const storeKey = `decision:${check.id}`;

  useEffect(() => {
    if (!isStatic) return;
    try { const v = localStorage.getItem(storeKey); if (v) setLocal(JSON.parse(v)); } catch {}
  }, [storeKey]);

  const decided: Saved | null =
    check.status === 'approved' || check.status === 'blocked'
      ? { action: check.status === 'approved' ? 'approve' : 'block', note: check.decisionNote ?? '', at: check.decidedAt ?? '' }
      : local;

  const counts = countCases(check.cases);
  const open = counts.worse + counts.unclear;
  const gate = checkDecision(check.cases, { action: 'approve', note });
  const steps = [
    { ok: counts.pending === 0, label: counts.pending === 0 ? 'All conversations replayed' : `${counts.pending} still replaying` },
    { ok: counts.failed === 0, label: counts.failed === 0 ? 'No failed replays' : `${counts.failed} failed, retry first` },
    { ok: open === 0 || note.trim().length >= MIN_NOTE, label: open === 0 ? 'Nothing worse or unclear' : `${open} worse or unclear, note required` },
  ];

  async function submit(action: 'approve' | 'block') {
    setError(null);
    if (isStatic) {
      const g = checkDecision(check.cases, { action, note });
      if (!g.ok) return setError(g.reason);
      const saved = { action, note, at: new Date().toISOString() };
      try { localStorage.setItem(storeKey, JSON.stringify(saved)); } catch {}
      return setLocal(saved);
    }
    setBusy(true);
    const res = await fetch(`/api/checks/${check.id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note }),
    });
    const body = (await res.json()) as { ok: boolean; reason?: string };
    setBusy(false);
    if (!body.ok) return setError(body.reason ?? 'Refused.');
    router.refresh();
  }

  if (decided) {
    const approved = decided.action === 'approve';
    return (
      <div className="card p-4">
        <div className={`mb-2 flex items-center gap-2 font-medium ${approved ? 'text-better' : 'text-worse'}`}>
          {approved ? <ShieldCheck size={16} /> : <ShieldX size={16} />}
          {approved ? 'Approved for release' : 'Release blocked'}
        </div>
        {decided.note && <p className="rounded-md border border-line bg-panel-2 p-2.5 whitespace-pre-wrap">{decided.note}</p>}
        <p className="mt-2 text-[11.5px] text-faint">{decided.at && new Date(decided.at).toLocaleString('en-GB')}{isStatic && ' · saved in this browser'}</p>
        {isStatic && (
          <button onClick={() => { try { localStorage.removeItem(storeKey); } catch {} setLocal(null); }} className="mt-2 text-[12px] text-accent hover:underline">
            Reset demo decision
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="mb-3 font-medium">Decision</div>
      <ul className="mb-3 space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className={`flex items-center gap-2 ${s.ok ? 'text-muted' : 'text-fg'}`}>
            {s.ok ? <Check size={14} className="text-better" /> : <Circle size={14} className="text-unclear" />}
            {s.label}
          </li>
        ))}
      </ul>
      <label className="mb-1 block text-[12px] text-muted" htmlFor="note">
        Note {open > 0 ? <span className="text-faint">(required to approve, {MIN_NOTE}+ characters)</span> : <span className="text-faint">(optional)</span>}
      </label>
      <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3}
        placeholder={open > 0 ? 'Why is it fine to ship with these changes?' : 'Anything the team should know'}
        className="w-full resize-none rounded-lg border border-line bg-panel-2 px-3 py-2 outline-none placeholder:text-faint focus:border-accent/60 focus:ring-2 focus:ring-accent-soft" />
      <div className="mt-1 text-right text-[11px] text-faint tabular-nums">{note.trim().length}/{MIN_NOTE}</div>
      {error && <p className="mt-2 flex items-start gap-1.5 text-worse"><X size={13} className="mt-0.5 shrink-0" />{error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => submit('block')} disabled={busy}
          className="rounded-lg border border-worse/40 px-3 py-2 font-medium text-worse hover:bg-worse-soft disabled:opacity-50">Block</button>
        <button onClick={() => submit('approve')} disabled={busy || !gate.ok} title={gate.ok ? '' : gate.reason}
          className="rounded-lg bg-accent px-3 py-2 font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">Approve</button>
      </div>
      {!gate.ok && <p className="mt-2 text-[11.5px] text-faint">{gate.reason}</p>}
    </div>
  );
}
