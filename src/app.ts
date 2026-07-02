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
import { jobRoutes } from './modules/jobs/job.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
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
  await app.register(swagger, { openapi: { info: { title: 'TaskFlow Queue API', version: '0.1.0' } } });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send(fail('Validation failed','VALIDATION_ERROR',err.issues));
    if (err instanceof AppError) return reply.code(err.statusCode).send(fail(err.message, err.code, err.details));
    app.log.error(err); return reply.code(500).send(fail('Internal server error','INTERNAL_SERVER_ERROR'));
  });
  app.get('/health', async () => ok('Service healthy', { uptime: process.uptime() }));
  app.get('/metrics', { preHandler: requireAdmin }, async () => {
    const [jobs, users, queue] = await Promise.all([prisma.job.groupBy({ by:['status'], _count:true }), prisma.user.count(), jobQueue.getJobCounts()]);
    return ok('Metrics retrieved successfully', { users, jobs, queue });
  });
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(jobRoutes, { prefix: '/api/v1/jobs' });
  app.register(userRoutes, { prefix: '/api/v1/users' });
  app.get('/api/v1/queues/summary', { preHandler: requireAdmin }, async () => ok('Queue summary retrieved successfully', await jobQueue.getJobCounts()));
  app.post('/api/v1/queues/default/pause', { preHandler: requireAdmin }, async () => { await jobQueue.pause(); return ok('Queue paused successfully', null); });
  app.post('/api/v1/queues/default/resume', { preHandler: requireAdmin }, async () => { await jobQueue.resume(); return ok('Queue resumed successfully', null); });
  app.post('/api/v1/queues/default/clean', { preHandler: requireAdmin }, async () => ok('Queue cleaned successfully', { completed: await jobQueue.clean(0, 1000, 'completed'), failed: await jobQueue.clean(0, 1000, 'failed') }));
  app.get('/api/v1/audit-logs', { preHandler: requireAdmin }, async () => ok('Data retrieved successfully', await prisma.auditLog.findMany({ orderBy:{ createdAt:'desc' }, take:100 })));
  app.get('/api/v1/workers', { preHandler: requireAdmin }, async () => ok('Data retrieved successfully', await prisma.worker.findMany({ orderBy:{ updatedAt:'desc' } })));
  app.get('/api/v1/workers/:id', { preHandler: requireAdmin }, async (req:any) => ok('Data retrieved successfully', await prisma.worker.findUniqueOrThrow({ where:{ id:req.params.id } })));
  app.get('/api/v1/dead-letter', { preHandler: requireAdmin }, async () => ok('Data retrieved successfully', await prisma.job.findMany({ where:{ status:'DEAD_LETTER' }, orderBy:{ failedAt:'desc' }, take:100 })));
  return app;
}
