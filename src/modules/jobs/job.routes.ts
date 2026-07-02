import { FastifyInstance } from 'fastify';
import { createJobSchema, listJobQuery } from './job.schema.js';
import { JobService } from './job.service.js';
import { ok } from '../../shared/response.js';
import { requireAuth, requireRoles } from '../../shared/auth.js';

const service = new JobService();

export async function jobRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.post('/', { schema:{ tags:['Jobs'], description:'Create a job and enqueue it to BullMQ. Supports Idempotency-Key header.', headers:{ type:'object', properties:{ 'idempotency-key':{ type:'string', example:'invoice-INV-001' } } }, body:{ type:'object', required:['type','payload'], properties:{ type:{ type:'string', enum:['GENERATE_INVOICE','SEND_EMAIL','SEND_WEBHOOK','EXPORT_REPORT'], example:'GENERATE_INVOICE' }, priority:{ type:'number', example:2 }, maxAttempts:{ type:'number', example:3 }, delayMs:{ type:'number', example:0 }, payload:{ type:'object', example:{ invoiceId:'INV-001', customerName:'Dimas Juli Pratama', items:[{ name:'API Usage', quantity:1, price:250000 }] } } } } } }, async (req:any) => {
    requireRoles(req.user, ['ADMIN','DEVELOPER']);
    return ok('Job created successfully', await service.create(req.user, createJobSchema.parse(req.body), req.headers['idempotency-key']));
  });
  app.get('/', { schema:{ tags:['Jobs'], description:'List jobs with pagination and role-based visibility.' } }, async (req:any) => { const result = await service.list(req.user, listJobQuery.parse(req.query)); return ok('Data retrieved successfully', result.items, result.meta); });
  app.get('/:id', { schema:{ tags:['Jobs'], description:'Get job detail with attempts and events.' } }, async (req:any) => ok('Data retrieved successfully', await service.get(req.user, req.params.id)));
  app.get('/:id/attempts', { schema:{ tags:['Jobs'], description:'Get job attempts.' } }, async (req:any) => ok('Data retrieved successfully', (await service.get(req.user, req.params.id)).jobAttempts));
  app.get('/:id/events', { schema:{ tags:['Jobs'], description:'Get job event timeline.' } }, async (req:any) => ok('Data retrieved successfully', (await service.get(req.user, req.params.id)).events));
  app.post('/:id/retry', { schema:{ tags:['Jobs'], description:'Manually retry FAILED or DEAD_LETTER job.' } }, async (req:any) => { requireRoles(req.user, ['ADMIN','DEVELOPER']); return ok('Job retried successfully', await service.retry(req.user, req.params.id)); });
  app.post('/:id/cancel', { schema:{ tags:['Jobs'], description:'Cancel queued, delayed, or retrying job and remove active BullMQ job when possible.' } }, async (req:any) => { requireRoles(req.user, ['ADMIN','DEVELOPER']); return ok('Job cancelled successfully', await service.cancel(req.user, req.params.id)); });
}
