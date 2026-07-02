import { describe, expect, it } from 'vitest';
import { stableHash } from '../src/shared/hash.js';

describe('idempotency request hash', () => {
  it('returns same hash for same payload with different key order', () => {
    expect(stableHash({ type:'SEND_EMAIL', payload:{ subject:'A', body:'B' } })).toBe(stableHash({ payload:{ body:'B', subject:'A' }, type:'SEND_EMAIL' }));
  });

  it('returns different hash for different payload', () => {
    expect(stableHash({ payload:{ body:'A' } })).not.toBe(stableHash({ payload:{ body:'B' } }));
  });
});
