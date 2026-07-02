import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireRoles } from '../../shared/auth.js';
import { notFound } from '../../shared/errors.js';
import { ok } from '../../shared/response.js';
import { audit } from '../audit/audit.service.js';
import { updateUserRoleSchema } from './user.schema.js';

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (req:any) => { await requireAuth(req); requireRoles(req.user, ['ADMIN']); });
  app.get('/', async () => ok('Data retrieved successfully', await prisma.user.findMany({ select:{ id:true, name:true, email:true, role:true, createdAt:true, updatedAt:true }, orderBy:{ createdAt:'desc' } })));
  app.patch('/:id/role', async (req:any) => {
    const { role } = updateUserRoleSchema.parse(req.body);
    const user = await prisma.user.update({ where:{ id:req.params.id }, data:{ role }, select:{ id:true, name:true, email:true, role:true, createdAt:true, updatedAt:true } }).catch(() => null);
    if (!user) throw notFound('NOT_FOUND','User not found');
    await audit(req.user.id, 'UPDATE_USER_ROLE', 'user', user.id, { role });
    return ok('User role updated successfully', user);
  });
}
