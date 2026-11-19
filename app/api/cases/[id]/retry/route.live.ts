import { NextResponse } from 'next/server';
import { db } from '@/data/live';
import { replayQueue } from '@/lib/queue';
import { retryCase } from '@/services/checks';

const queue = replayQueue();

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await retryCase(db, queue, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: (e as Error).message }, { status: 409 });
  }
}
