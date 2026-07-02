import { z } from 'zod';
export const jobType = z.enum(['GENERATE_INVOICE','SEND_EMAIL','SEND_WEBHOOK','EXPORT_REPORT']);
export const createJobSchema = z.object({ type:jobType, priority:z.number().int().min(1).max(10).default(5), maxAttempts:z.number().int().min(1).max(10).default(3), delayMs:z.number().int().min(0).default(0), idempotencyKey:z.string().min(3).optional(), payload:z.record(z.string(), z.unknown()) });
export const listJobQuery = z.object({ status:z.string().optional(), type:z.string().optional(), page:z.coerce.number().int().min(1).default(1), limit:z.coerce.number().int().min(1).max(100).default(10) });
