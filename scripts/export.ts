// Writes every release check from Postgres to fixtures/snapshot.json, which the
// static demo (STATIC=1 next build) renders read-only.
import { writeFileSync } from 'node:fs';
import { loadChecks } from '@/data/live';

const checks = await loadChecks();
writeFileSync('fixtures/snapshot.json', JSON.stringify(checks, null, 1));
console.log(`exported ${checks.length} check(s)`);
process.exit(0);
