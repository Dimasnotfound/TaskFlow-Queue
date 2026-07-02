import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors.js';

const OFFLINE_AFTER_MS = 30_000;

export function withComputedStatus(worker:any) {
  const stale = !worker.lastHeartbeatAt || Date.now() - new Date(worker.lastHeartbeatAt).getTime() > OFFLINE_AFTER_MS;
  return { ...worker, computedStatus: stale && worker.status === 'RUNNING' ? 'OFFLINE' : worker.status };
}

export async function listWorkers() {
  const workers = await prisma.worker.findMany({ orderBy:{ updatedAt:'desc' } });
  return workers.map(withComputedStatus);
}

export async function getWorker(id:string) {
  const worker = await prisma.worker.findUnique({ where:{ id } });
  if (!worker) throw new AppError(404, 'NOT_FOUND', 'Worker not found');
  return withComputedStatus(worker);
}
