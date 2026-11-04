import { describe, expect, it } from 'vitest';
import { isTypingTarget } from '../src/lib/shortcuts';

describe('isTypingTarget', () => {
  it('ignores null', () => {
    expect(isTypingTarget(null)).toBe(false);
  });
});
