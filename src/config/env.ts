import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  DEFAULT_QUEUE_NAME: z.string().default('default'),
  WORKER_NAME: z.string().default('default-worker-1'),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  STORAGE_PATH: z.string().default('./src/storage'),
});

export const env = schema.parse(process.env);
