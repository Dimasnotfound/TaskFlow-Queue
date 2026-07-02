import { prisma } from '../../config/prisma.js';
export async function audit(actorId:string|undefined, action:string, resource:string, resourceId?:string, metadata?:unknown) {
 await prisma.auditLog.create({ data:{ actorId, action, resource, resourceId, metadata: metadata as object } });
}
