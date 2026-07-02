import { describe, expect, it } from 'vitest';
import { withComputedStatus } from '../src/modules/workers/worker.service.js';

describe('worker computed status', () => {
  it('marks stale RUNNING worker as OFFLINE', () => {
    const worker = { status:'RUNNING', lastHeartbeatAt:new Date(Date.now() - 31_000) };
    expect(withComputedStatus(worker).computedStatus).toBe('OFFLINE');
  });

  it('keeps fresh RUNNING worker as RUNNING', () => {
    const worker = { status:'RUNNING', lastHeartbeatAt:new Date() };
    expect(withComputedStatus(worker).computedStatus).toBe('RUNNING');
  });
});
