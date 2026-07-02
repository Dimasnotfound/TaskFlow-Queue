import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireRoles } from '../../shared/auth.js';
import { ok } from '../../shared/response.js';

async function requireAdmin(req:any) { await requireAuth(req); requireRoles(req.user, ['ADMIN']); }

export async function deadLetterRoutes(app:FastifyInstance) {
  app.get('/', { preHandler: requireAdmin, schema:{ tags:['Jobs'], description:'List jobs in DEAD_LETTER status.' } }, async () => ok('Data retrieved successfully', await prisma.job.findMany({ where:{ status:'DEAD_LETTER' }, orderBy:{ failedAt:'desc' }, take:100 })));
}
