import { describe, expect, it } from 'vitest';
import { createJobSchema } from '../src/modules/jobs/job.schema.js';

describe('job payload validation', () => {
  it('accepts valid GENERATE_INVOICE payload', () => {
    const parsed = createJobSchema.parse({ type:'GENERATE_INVOICE', payload:{ invoiceId:'INV-001', customerName:'Dimas', items:[{ name:'API Usage', quantity:1, price:250000 }] } });
    expect(parsed.type).toBe('GENERATE_INVOICE');
  });

  it('rejects invalid SEND_EMAIL payload before queueing', () => {
    expect(() => createJobSchema.parse({ type:'SEND_EMAIL', payload:{ to:'not-email', subject:'Hi', body:'Body' } })).toThrow();
  });

  it('accepts valid SEND_WEBHOOK payload', () => {
    const parsed = createJobSchema.parse({ type:'SEND_WEBHOOK', payload:{ url:'https://example.com/webhook', event:'job.completed', data:{ id:'1' } } });
    expect(parsed.type).toBe('SEND_WEBHOOK');
    if (parsed.type === 'SEND_WEBHOOK') expect(parsed.payload.event).toBe('job.completed');
  });
});
