import { Queue } from 'bullmq';
import { env } from './env.js';

export const connection = { host: env.REDIS_HOST, port: env.REDIS_PORT, password: env.REDIS_PASSWORD };
export const jobQueue = new Queue(env.DEFAULT_QUEUE_NAME, { connection });
