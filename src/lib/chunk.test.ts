import { describe, expect, it } from 'vitest';
import { chunkText } from './chunk';

describe('chunkText', () => {
  it('returns one chunk for short text', () => {
    expect(chunkText('abc', 10)).toEqual(['abc']);
  });
  it('splits on line boundaries and keeps all content', () => {
    const text = Array.from({ length: 20 }, (_, i) => `line-${i}`).join('\n');
    const chunks = chunkText(text, 30);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 30)).toBe(true);
    expect(chunks.join('\n')).toBe(text);
  });
  it('hard-splits a single oversized line', () => {
    const chunks = chunkText('x'.repeat(25), 10);
    expect(chunks.map((c) => c.length)).toEqual([10, 10, 5]);
  });
});
