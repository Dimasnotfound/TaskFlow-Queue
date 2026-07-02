import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireRoles } from '../../shared/auth.js';
import { ok } from '../../shared/response.js';

async function requireAdmin(req:any) { await requireAuth(req); requireRoles(req.user, ['ADMIN']); }

export async function auditRoutes(app:FastifyInstance) {
  app.get('/', { preHandler: requireAdmin, schema:{ tags:['Audit'], description:'List latest audit logs.' } }, async () => ok('Data retrieved successfully', await prisma.auditLog.findMany({ orderBy:{ createdAt:'desc' }, take:100 })));
}
