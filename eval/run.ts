// Scores the latest release check against the planted labels in
// fixtures/helpdesk.ts and writes eval/results.md.
import { writeFileSync } from 'node:fs';
import { CASES, v1FollowedRule } from '../fixtures/helpdesk';
import type { TraceStep } from '@/core/replay';
import { createPrismaClient } from '@/lib/prisma';

const db = createPrismaClient();
const which = process.argv[2];
const check = await db.releaseCheck.findFirstOrThrow({
  where: which ? { label: which } : {},
  orderBy: { createdAt: 'desc' },
  include: { cases: { include: { conversation: true } }, baseVersion: true, candidateVersion: true },
});
const rows = check.cases.map((c) => {
  const label = CASES.find((x) => x.title === c.conversation.title);
  if (!label) throw new Error(`No label for ${c.conversation.title}`);
  const flagged = c.verdict === 'worse' || c.verdict === 'unclear';
  const v1Tools = ((c.baseTrace ?? []) as TraceStep[]).flatMap((s) => (s.kind === 'tool' ? [s.call] : []));
  const valid = label.expected === 'same' || v1FollowedRule(label.title, v1Tools);
  return { title: c.conversation.title, expected: valid ? label.expected : 'v1 broke rule', verdict: c.verdict ?? c.status, flagged, reason: c.reason ?? c.error ?? '' };
});
const worse = rows.filter((r) => r.expected === 'worse');
const v1Broke = rows.filter((r) => r.expected === 'v1 broke rule');
const same = rows.filter((r) => r.expected === 'same');
const failed = check.cases.filter((c) => c.status === 'failed').length;
const noJudge = check.cases.filter((c) => c.reason?.startsWith('Identical answer')).length;

const summary = [
  `Release check ${check.label ? `"${check.label}" ` : ''}${check.baseVersion.label} -> ${check.candidateVersion.label} on ${rows.length} conversations (${check.baseVersion.model}).`,
  `Planted regressions flagged for a person (worse or unclear): ${worse.filter((r) => r.flagged).length} of ${worse.length}`,
  `  not counted: ${v1Broke.length} planted case(s) where v1 itself broke the rule in this replay${v1Broke.length ? ` (${v1Broke.map((r) => `${r.title}: ${r.verdict}`).join('; ')})` : ''}`,
  `  of which judged worse outright: ${worse.filter((r) => r.verdict === 'worse').length} of ${worse.length}`,
  `False alarms on unchanged behaviour (worse or unclear): ${same.filter((r) => r.flagged).length} of ${same.length}`,
  `Settled as same without a judge call: ${noJudge}`,
  `Cases that failed to replay: ${failed}`,
];
const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = ['| Case | Planted | Verdict | Reason |', '|---|---|---|---|',
  ...rows.map((r) => `| ${r.title} | ${r.expected} | ${r.verdict} | ${esc(r.reason)} |`)];
writeFileSync('eval/results.md', `# Eval results\n\n${summary.map((s) => `- ${s.trim()}`).join('\n')}\n\n${table.join('\n')}\n`);
console.log(summary.join('\n'));
await db.$disconnect();
