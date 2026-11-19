// Where the pages get their data: Postgres in the app, the snapshot file in
// the static demo.
import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { connection } from 'next/server';
import type { CheckView } from './types';
import { summarise } from './summary';

const isStatic = process.env['STATIC'] === '1';

function fromSnapshot(): CheckView[] {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'fixtures/snapshot.json'), 'utf8')) as CheckView[];
}

export async function allChecks(): Promise<CheckView[]> {
  if (isStatic) return fromSnapshot();
  await connection(); // read fresh on every request in the app
  const { loadChecks } = await import('./live');
  return loadChecks();
}

export async function listChecks() {
  return (await allChecks()).map(summarise);
}

export async function getCheck(id: string): Promise<CheckView | null> {
  if (isStatic) return fromSnapshot().find((c) => c.id === id) ?? null;
  await connection();
  const { loadChecks } = await import('./live');
  return (await loadChecks(id))[0] ?? null;
}
