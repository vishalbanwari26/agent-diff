// During a replay the agent may call any tool it likes, but nothing it does
// reaches a real system. A call is answered from what production recorded. A
// read-only tool (search, lookup) asked something new may answer from a
// read-only source; a tool that changes state answers only from the recording.

export type ToolCall = { name: string; args: Record<string, unknown> };
export type Recorded = Record<string, { args: Record<string, unknown>; result: unknown }[]>;
export type ReadOnlyTools = Record<string, (args: Record<string, unknown>) => unknown>;
export type ToolAnswer =
  | { kind: 'recorded'; result: unknown }
  | { kind: 'read'; result: unknown } // read-only tool, answered from a read-only source
  | { kind: 'unrecorded'; result: { status: 'accepted'; id: string; note: string } };

// Stable JSON: object keys sorted, so {a:1,b:2} and {b:2,a:1} give the same string.
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function answerToolCall(call: ToolCall, recorded: Recorded, readOnly: ReadOnlyTools = {}): ToolAnswer {
  const hit = (recorded[call.name] ?? []).find((r) => canonical(r.args) === canonical(call.args));
  if (hit) return { kind: 'recorded', result: hit.result };
  const read = readOnly[call.name];
  if (read) return { kind: 'read', result: read(call.args) };
  // An action production never took. It is not executed; the model gets a plain
  // acknowledgement so it does not retry, and the call still counts as new.
  return {
    kind: 'unrecorded',
    result: { status: 'accepted', id: `REPLAY-${short(canonical(call.args))}`, note: 'Replay: not executed, held for review.' },
  };
}

// A short stable id from the arguments, so the same call gets the same id.
function short(text: string): string {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 1_000_000;
  return String(h).padStart(6, '0');
}
