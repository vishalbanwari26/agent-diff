'use client';
import { useState } from 'react';
import { ChevronRight, CircleAlert, Cpu, Wrench } from 'lucide-react';
import type { TraceStep } from '@/core/replay';
import { canonical } from '@/core/replay-tools';

export type ToolCallView = { key: string; name: string; args: Record<string, unknown> };

export function toolCalls(trace: TraceStep[] | null): ToolCallView[] {
  return (trace ?? []).flatMap((s) => (s.kind === 'tool' ? [{ key: `${s.call.name}${canonical(s.call.args)}`, name: s.call.name, args: s.call.args }] : []));
}

export function Trace({ trace, otherKeys }: { trace: TraceStep[] | null; otherKeys: Set<string> }) {
  if (!trace) return <p className="text-faint">No trace.</p>;
  let round = 0;
  return (
    <ol className="relative space-y-1.5 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-line">
      {trace.map((s, i) => {
        if (s.kind === 'model') {
          round++;
          return (
            <li key={i} className="relative flex items-center gap-2.5 pl-0.5 text-muted">
              <span className="z-10 grid size-[22px] place-items-center rounded-full border border-line bg-panel-2"><Cpu size={11} /></span>
              <span>Model round {round}</span>
              <span className="text-faint">· {s.ms} ms</span>
              <span className="text-faint">· {s.toolCalls.length ? `${s.toolCalls.length} tool call${s.toolCalls.length > 1 ? 's' : ''}` : 'final answer'}</span>
            </li>
          );
        }
        const key = `${s.call.name}${canonical(s.call.args)}`;
        return <ToolStep key={i} step={s} isNew={!otherKeys.has(key)} />;
      })}
    </ol>
  );
}

function ToolStep({ step, isNew }: { step: Extract<TraceStep, { kind: 'tool' }>; isNew: boolean }) {
  const [open, setOpen] = useState(false);
  const unrecorded = step.answer.kind === 'unrecorded';
  return (
    <li className="relative">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-2.5 rounded-md py-0.5 pl-0.5 text-left hover:bg-hover">
        <span className={`z-10 mt-px grid size-[22px] shrink-0 place-items-center rounded-full border ${unrecorded ? 'border-unclear/40 bg-unclear-soft text-unclear' : 'border-line bg-panel-2 text-muted'}`}>
          {unrecorded ? <CircleAlert size={11} /> : <Wrench size={11} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[12px] font-medium">{step.call.name}</span>
            {isNew && <span className="rounded bg-accent-soft px-1 text-[10.5px] font-medium text-accent">only in this version</span>}
            {unrecorded && <span className="rounded bg-unclear-soft px-1 text-[10.5px] font-medium text-unclear">new action, not in recording</span>}
            {step.answer.kind === 'read' && <span className="rounded bg-hover px-1 text-[10.5px] font-medium text-muted">read-only lookup</span>}
          </span>
          <span className="block truncate font-mono text-[11.5px] text-faint">{JSON.stringify(step.call.args)}</span>
        </span>
        <ChevronRight size={13} className={`mt-1 shrink-0 text-faint transition ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <pre className="scroll-thin mt-1 ml-8 overflow-x-auto rounded-md border border-line bg-panel-2 p-2.5 font-mono text-[11.5px] text-muted">
          {JSON.stringify(step.answer.result, null, 2)}
        </pre>
      )}
    </li>
  );
}
