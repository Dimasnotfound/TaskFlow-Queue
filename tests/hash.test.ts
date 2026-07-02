import { describe, expect, it } from 'vitest';
import { stableHash, tokenHash } from '../src/shared/hash.js';

describe('hash helpers', () => {
  it('creates stable sha256 hashes', () => {
    expect(stableHash({ a: 1 })).toHaveLength(64);
    expect(stableHash({ a: 1 })).toBe(stableHash({ a: 1 }));
    expect(tokenHash('refresh-token')).toHaveLength(64);
  });
});
