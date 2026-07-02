import IORedis from 'ioredis';
import { env } from './env.js';
const RedisCtor = IORedis as unknown as new (options: object) => unknown;
export const redis = new RedisCtor({ host: env.REDIS_HOST, port: env.REDIS_PORT, password: env.REDIS_PASSWORD, maxRetriesPerRequest: null });
