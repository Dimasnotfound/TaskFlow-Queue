import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { jobQueue } from './config/queue.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { deadLetterRoutes } from './modules/dead-letter/dead-letter.routes.js';
import { jobRoutes } from './modules/jobs/job.routes.js';
import { queueRoutes } from './modules/queues/queue.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { workerRoutes } from './modules/workers/worker.routes.js';
import { requireAuth, requireRoles } from './shared/auth.js';
import { AppError } from './shared/errors.js';
import { fail, ok } from './shared/response.js';

async function requireAdmin(req:any) { await requireAuth(req); requireRoles(req.user, ['ADMIN']); }

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors);
  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });
  await app.register(swagger, { openapi: { info: { title: 'TaskFlow Queue API', version: '0.1.0', description:'Portfolio backend for asynchronous job processing with Fastify, BullMQ, Redis, PostgreSQL, Prisma, and worker process.' }, tags:[{ name:'Auth', description:'Authentication and refresh token endpoints' },{ name:'Jobs', description:'Job creation, lifecycle, retry, cancel, and dead letter endpoints' },{ name:'Queues', description:'BullMQ operational endpoints' },{ name:'Workers', description:'Worker heartbeat and computed status endpoints' },{ name:'Audit', description:'Audit log endpoints' },{ name:'Health', description:'Health and metrics endpoints' }] } });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send(fail('Validation failed','VALIDATION_ERROR',err.issues));
    if (err instanceof AppError) return reply.code(err.statusCode).send(fail(err.message, err.code, err.details));
    app.log.error(err); return reply.code(500).send(fail('Internal server error','INTERNAL_SERVER_ERROR'));
  });
  app.get('/health', { schema:{ tags:['Health'], description:'Service health check.' } }, async () => ok('Service healthy', { uptime: process.uptime() }));
  app.get('/metrics', { preHandler: requireAdmin, schema:{ tags:['Health'], description:'Admin metrics summary for jobs, users, and queue counts.' } }, async () => {
    const [jobs, users, queue] = await Promise.all([prisma.job.groupBy({ by:['status'], _count:true }), prisma.user.count(), jobQueue.getJobCounts()]);
    return ok('Metrics retrieved successfully', { users, jobs, queue });
  });
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(jobRoutes, { prefix: '/api/v1/jobs' });
  app.register(userRoutes, { prefix: '/api/v1/users' });
  app.register(workerRoutes, { prefix: '/api/v1/workers' });
  app.register(queueRoutes, { prefix: '/api/v1/queues' });
  app.register(auditRoutes, { prefix: '/api/v1/audit-logs' });
  app.register(deadLetterRoutes, { prefix: '/api/v1/dead-letter' });
  return app;
}
