// Reads release checks from Postgres and shapes them for the pages.
import { createPrismaClient } from '@/lib/prisma';
import type { TraceStep } from '@/core/replay';
import type { CheckView } from './types';

const g = globalThis as unknown as { db?: ReturnType<typeof createPrismaClient> };
export const db = (g.db ??= createPrismaClient());

export async function loadChecks(id?: string): Promise<CheckView[]> {
  const rows = await db.releaseCheck.findMany({
    where: id ? { id } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      agent: true, baseVersion: true, candidateVersion: true,
      cases: { include: { conversation: true }, orderBy: { conversation: { createdAt: 'asc' } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    agentName: r.agent.name,
    base: { label: r.baseVersion.label, model: r.baseVersion.model, systemPrompt: r.baseVersion.systemPrompt },
    candidate: { label: r.candidateVersion.label, model: r.candidateVersion.model, systemPrompt: r.candidateVersion.systemPrompt },
    status: r.status,
    label: r.label,
    decisionNote: r.decisionNote,
    decidedAt: r.decidedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    cases: r.cases.map((c) => ({
      id: c.id,
      title: c.conversation.title,
      message: (c.conversation.messages as string[])[0] ?? '',
      status: c.status,
      verdict: c.verdict,
      reason: c.reason,
      error: c.error,
      attempts: c.attempts,
      baseAnswer: c.baseAnswer,
      candidateAnswer: c.candidateAnswer,
      baseTrace: c.baseTrace as TraceStep[] | null,
      candidateTrace: c.candidateTrace as TraceStep[] | null,
    })),
  }));
}
