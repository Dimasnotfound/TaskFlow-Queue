import { FastifyInstance } from 'fastify';
import { requireAuth, requireRoles } from '../../shared/auth.js';
import { ok } from '../../shared/response.js';
import { getWorker, listWorkers } from './worker.service.js';

async function requireAdmin(req:any) { await requireAuth(req); requireRoles(req.user, ['ADMIN']); }

export async function workerRoutes(app:FastifyInstance) {
  app.get('/', { preHandler: requireAdmin }, async () => ok('Data retrieved successfully', await listWorkers()));
  app.get('/:id', { preHandler: requireAdmin }, async (req:any) => ok('Data retrieved successfully', await getWorker(req.params.id)));
}
