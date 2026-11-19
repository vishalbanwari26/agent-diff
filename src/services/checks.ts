// Release checks: create one, replay its cases, retry a failed case, decide.
// The rules themselves live in src/core; this file only loads and saves.
import type { Prisma, PrismaClient } from '@prisma/client';

const asJson = (v: unknown) => v as Prisma.InputJsonValue;
import type { Queue } from 'bullmq';
import type { ChatFn, ToolDef } from '@/lib/model';
import type { ReplayJob } from '@/lib/queue';
import type { ReadOnlyTools, Recorded } from '@/core/replay-tools';
import { runVersion } from '@/core/replay';
import { judgeCase, type JudgeFn } from '@/core/verdict';
import { checkDecision, type Decision } from '@/core/gate';

export async function createCheck(
  db: PrismaClient, queue: Queue<ReplayJob>, agentId: string, base: string, candidate: string, label?: string,
) {
  const [b, c] = await Promise.all([
    db.agentVersion.findUniqueOrThrow({ where: { agentId_label: { agentId, label: base } } }),
    db.agentVersion.findUniqueOrThrow({ where: { agentId_label: { agentId, label: candidate } } }),
  ]);
  const conversations = await db.conversation.findMany({ where: { agentId }, select: { id: true } });
  const check = await db.releaseCheck.create({
    data: {
      agentId, baseVersionId: b.id, candidateVersionId: c.id, label: label ?? null,
      cases: { create: conversations.map((cv) => ({ conversationId: cv.id })) },
    },
    include: { cases: true },
  });
  await queue.addBulk(check.cases.map((rc) => ({ name: 'replay', data: { caseId: rc.id }, opts: { jobId: `${rc.id}-0` } })));
  return check;
}

export async function processCase(db: PrismaClient, caseId: string, chat: ChatFn, judge: JudgeFn, readOnly: ReadOnlyTools = {}) {
  const rc = await db.replayCase.update({
    where: { id: caseId },
    data: { status: 'running', attempts: { increment: 1 }, error: null },
    include: { conversation: true, check: { include: { baseVersion: true, candidateVersion: true } } },
  });
  try {
    const message = (rc.conversation.messages as string[])[0] ?? '';
    const recorded = rc.conversation.recordedTools as Recorded;
    const asVersion = (v: { model: string; systemPrompt: string; tools: unknown }) =>
      ({ model: v.model, systemPrompt: v.systemPrompt, tools: v.tools as ToolDef[] });
    const base = await runVersion(asVersion(rc.check.baseVersion), message, recorded, chat, readOnly);
    const cand = await runVersion(asVersion(rc.check.candidateVersion), message, recorded, chat, readOnly);
    const j = await judgeCase(message, base, cand, judge);
    await db.replayCase.update({
      where: { id: caseId },
      data: {
        status: 'done', baseAnswer: base.answer, candidateAnswer: cand.answer,
        baseTrace: asJson(base.trace), candidateTrace: asJson(cand.trace), verdict: j.verdict, reason: j.reason,
      },
    });
  } catch (e) {
    await db.replayCase.update({ where: { id: caseId }, data: { status: 'failed', error: (e as Error).message } });
  }
  await refreshStatus(db, rc.checkId);
}

export async function retryCase(db: PrismaClient, queue: Queue<ReplayJob>, caseId: string) {
  const rc = await db.replayCase.findUniqueOrThrow({ where: { id: caseId } });
  if (rc.status !== 'failed') throw new Error('Only failed cases can be retried.');
  await db.replayCase.update({ where: { id: caseId }, data: { status: 'queued' } });
  await db.releaseCheck.update({ where: { id: rc.checkId }, data: { status: 'running' } });
  await queue.add('replay', { caseId }, { jobId: `${caseId}-${rc.attempts}` });
}

export async function refreshStatus(db: PrismaClient, checkId: string) {
  const check = await db.releaseCheck.findUniqueOrThrow({ where: { id: checkId } });
  if (check.status === 'approved' || check.status === 'blocked') return;
  const pending = await db.replayCase.count({ where: { checkId, status: { in: ['queued', 'running'] } } });
  await db.releaseCheck.update({ where: { id: checkId }, data: { status: pending > 0 ? 'running' : 'ready' } });
}

export async function decide(db: PrismaClient, checkId: string, d: Decision) {
  const cases = await db.replayCase.findMany({ where: { checkId }, select: { status: true, verdict: true } });
  const gate = checkDecision(cases, d);
  if (!gate.ok) return gate;
  await db.releaseCheck.update({
    where: { id: checkId },
    data: { status: d.action === 'approve' ? 'approved' : 'blocked', decisionNote: d.note ?? null, decidedAt: new Date() },
  });
  return gate;
}
