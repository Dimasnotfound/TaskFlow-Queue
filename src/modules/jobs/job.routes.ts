import { FastifyInstance } from 'fastify';
import { createJobSchema, listJobQuery } from './job.schema.js';
import { JobService } from './job.service.js';
import { ok } from '../../shared/response.js';
import { requireAuth, requireRoles } from '../../shared/auth.js';

const service = new JobService();

export async function jobRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.post('/', async (req:any) => {
    requireRoles(req.user, ['ADMIN','DEVELOPER']);
    return ok('Job created successfully', await service.create(req.user, createJobSchema.parse(req.body), req.headers['idempotency-key']));
  });
  app.get('/', async (req:any) => { const result = await service.list(req.user, listJobQuery.parse(req.query)); return ok('Data retrieved successfully', result.items, result.meta); });
  app.get('/:id', async (req:any) => ok('Data retrieved successfully', await service.get(req.user, req.params.id)));
  app.get('/:id/attempts', async (req:any) => ok('Data retrieved successfully', (await service.get(req.user, req.params.id)).jobAttempts));
  app.get('/:id/events', async (req:any) => ok('Data retrieved successfully', (await service.get(req.user, req.params.id)).events));
  app.post('/:id/retry', async (req:any) => { requireRoles(req.user, ['ADMIN','DEVELOPER']); return ok('Job retried successfully', await service.retry(req.user, req.params.id)); });
  app.post('/:id/cancel', async (req:any) => { requireRoles(req.user, ['ADMIN','DEVELOPER']); return ok('Job cancelled successfully', await service.cancel(req.user, req.params.id)); });
}
