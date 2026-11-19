import { describe, expect, it } from 'vitest';
import { lineDiff } from '@/lib/line-diff';

describe('lineDiff', () => {
  it('marks removed and added lines and keeps shared ones', () => {
    expect(lineDiff('a\nb\nc', 'a\nc\nd')).toEqual([
      { kind: 'same', text: 'a' }, { kind: 'removed', text: 'b' }, { kind: 'same', text: 'c' }, { kind: 'added', text: 'd' },
    ]);
  });
});
