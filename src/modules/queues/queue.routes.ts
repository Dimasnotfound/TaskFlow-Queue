import { FastifyInstance } from 'fastify';
import { requireAuth, requireRoles } from '../../shared/auth.js';
import { ok } from '../../shared/response.js';
import { cleanQueue, getQueueSummary, pauseQueue, resumeQueue } from './queue.service.js';

async function requireAdmin(req:any) { await requireAuth(req); requireRoles(req.user, ['ADMIN']); }

export async function queueRoutes(app:FastifyInstance) {
  app.get('/summary', { preHandler: requireAdmin, schema:{ tags:['Queues'], description:'Get BullMQ queue counts.' } }, async () => ok('Queue summary retrieved successfully', await getQueueSummary()));
  app.post('/default/pause', { preHandler: requireAdmin, schema:{ tags:['Queues'], description:'Pause default queue.' } }, async () => ok('Queue paused successfully', await pauseQueue()));
  app.post('/default/resume', { preHandler: requireAdmin, schema:{ tags:['Queues'], description:'Resume default queue.' } }, async () => ok('Queue resumed successfully', await resumeQueue()));
  app.post('/default/clean', { preHandler: requireAdmin, schema:{ tags:['Queues'], description:'Clean completed and failed jobs from default queue.' } }, async () => ok('Queue cleaned successfully', await cleanQueue()));
}
