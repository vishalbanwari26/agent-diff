// The read-only source for the demo agent. At a real deployment this would be
// a read replica or a read-only API; here it is the same fake backend the
// recording used. Only tools that cannot change anything are listed.
import type { ReadOnlyTools } from '@/core/replay-tools';
import { fakeBackend } from './helpdesk';

export const READ_ONLY: ReadOnlyTools = {
  lookup_user: (args) => fakeBackend('lookup_user', args),
  search_kb: (args) => fakeBackend('search_kb', args),
};
