import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/data/live';
import { decide } from '@/services/checks';

const Body = z.object({ action: z.enum(['approve', 'block']), note: z.string().max(2000).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ ok: false, reason: 'Invalid decision.' }, { status: 400 });
  const result = await decide(db, id, body.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
