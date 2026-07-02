import { z } from 'zod';

const baseJobSchema = z.object({
  priority: z.number().int().min(1).max(10).default(5),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  delayMs: z.number().int().min(0).default(0),
  idempotencyKey: z.string().min(3).optional(),
});

export const createJobSchema = z.discriminatedUnion('type', [
  baseJobSchema.extend({
    type: z.literal('GENERATE_INVOICE'),
    payload: z.object({
      invoiceId: z.string().min(1),
      customerName: z.string().min(1),
      items: z.array(z.object({
        name: z.string().min(1),
        quantity: z.number().positive(),
        price: z.number().nonnegative(),
      })).min(1),
    }),
  }),
  baseJobSchema.extend({
    type: z.literal('SEND_EMAIL'),
    payload: z.object({
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
    }),
  }),
  baseJobSchema.extend({
    type: z.literal('SEND_WEBHOOK'),
    payload: z.object({
      url: z.string().url(),
      event: z.string().min(1),
      data: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  baseJobSchema.extend({
    type: z.literal('EXPORT_REPORT'),
    payload: z.object({
      reportType: z.string().min(1),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  }),
]);

export const listJobQuery = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
