import { JobStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { jobQueue } from '../../config/queue.js';
import { badRequest, conflict, forbidden, notFound } from '../../shared/errors.js';
import { stableHash } from '../../shared/hash.js';
import { audit } from '../audit/audit.service.js';

export class JobService {
  async create(user:any, input:any, headerKey?:string) {
    const idempotencyKey = input.idempotencyKey ?? headerKey;
    const requestHash = stableHash({ ...input, idempotencyKey });
    if (idempotencyKey) {
      const old = await prisma.idempotencyKey.findUnique({ where:{ key:idempotencyKey }, include:{ job:true } });
      if (old) {
        if (old.requestHash !== requestHash) throw conflict('IDEMPOTENCY_CONFLICT','Idempotency key reused with different payload');
        return old.job;
      }
    }
    const status = input.delayMs > 0 ? JobStatus.DELAYED : JobStatus.QUEUED;
    const job = await prisma.job.create({ data:{ type:input.type, status, priority:input.priority, maxAttempts:input.maxAttempts, payload:input.payload, payloadHash:stableHash(input.payload), idempotencyKey, createdById:user.id, scheduledAt: input.delayMs ? new Date(Date.now()+input.delayMs) : null, events:{ create:{ eventType:'JOB_CREATED', message:'Job created' } } } });
    if (idempotencyKey) await prisma.idempotencyKey.create({ data:{ key:idempotencyKey, requestHash, jobId:job.id, createdById:user.id } });
    await jobQueue.add(input.type, { jobId:job.id }, { jobId:job.id, priority:input.priority, attempts:input.maxAttempts, delay:input.delayMs, backoff:{ type:'exponential', delay:5000 } });
    await audit(user.id,'CREATE_JOB','job',job.id,{ type:input.type });
    return job;
  }
  private where(user:any, extra:any={}) { return user.role === 'ADMIN' ? extra : { ...extra, createdById:user.id }; }
  async list(user:any, q:any) {
    const where = this.where(user, { ...(q.status ? { status:q.status } : {}), ...(q.type ? { type:q.type } : {}) });
    const [items,total] = await Promise.all([prisma.job.findMany({ where, skip:(q.page-1)*q.limit, take:q.limit, orderBy:{createdAt:'desc'} }), prisma.job.count({ where })]);
    return { items, meta:{ page:q.page, limit:q.limit, total, totalPages:Math.ceil(total/q.limit) } };
  }
  async get(user:any,id:string) {
    const job = await prisma.job.findUnique({ where:{ id }, include:{ jobAttempts:true, events:true } });
    if (!job) throw notFound('JOB_NOT_FOUND','Job not found');
    if (user.role !== 'ADMIN' && job.createdById !== user.id) throw forbidden();
    return job;
  }
  async retry(user:any,id:string) {
    const job = await this.get(user,id);
    if (!['FAILED','DEAD_LETTER'].includes(job.status)) throw badRequest('JOB_NOT_RETRYABLE','Job is not retryable');
    const next = await prisma.job.update({ where:{id}, data:{ status:'QUEUED', errorCode:null, errorMessage:null, events:{create:{eventType:'JOB_RETRIED',message:'Job retried'}} } });
    await jobQueue.add(job.type,{jobId:id},{jobId:`retry-${id}-${Date.now()}`, attempts:job.maxAttempts, backoff:{type:'exponential',delay:5000}});
    await audit(user.id,'RETRY_JOB','job',id);
    return next;
  }
  async cancel(user:any,id:string) {
    const job = await this.get(user,id);
    if (!['QUEUED','DELAYED','RETRYING'].includes(job.status)) throw badRequest('JOB_NOT_CANCELLABLE','Job is not cancellable');
    await jobQueue.remove(id).catch(()=>undefined);
    const next = await prisma.job.update({ where:{id}, data:{ status:'CANCELLED', cancelledAt:new Date(), events:{create:{eventType:'JOB_CANCELLED',message:'Job cancelled'}} } });
    await audit(user.id,'CANCEL_JOB','job',id);
    return next;
  }
}
