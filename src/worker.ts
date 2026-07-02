import { Worker } from 'bullmq';
import { env } from './config/env.js';
import { connection } from './config/queue.js';
import { prisma } from './config/prisma.js';
import { processJob } from './processors/index.js';
import { AppError } from './shared/errors.js';

await prisma.worker.upsert({ where:{ name:env.WORKER_NAME }, update:{ status:'RUNNING', concurrency:env.WORKER_CONCURRENCY, lastHeartbeatAt:new Date() }, create:{ name:env.WORKER_NAME, status:'RUNNING', concurrency:env.WORKER_CONCURRENCY, lastHeartbeatAt:new Date() } });
const heartbeat = setInterval(() => prisma.worker.update({ where:{ name:env.WORKER_NAME }, data:{ lastHeartbeatAt:new Date() } }).catch(()=>undefined), 10000);

const worker = new Worker(env.DEFAULT_QUEUE_NAME, async (bullJob) => {
  const job = await prisma.job.findUniqueOrThrow({ where:{ id:bullJob.data.jobId } });
  if (job.status === 'CANCELLED') return null;
  const startedAt = new Date();
  const attempt = await prisma.jobAttempt.create({ data:{ jobId:job.id, attemptNumber:job.attempts+1, status:'PROCESSING', startedAt, workerName:env.WORKER_NAME } });
  await prisma.job.update({ where:{ id:job.id }, data:{ status:'PROCESSING', startedAt, attempts:{ increment:1 }, events:{ create:{ eventType:'JOB_PROCESSING', message:'Job processing started' } } } });
  try {
    const result = await processJob(job.type, job.payload);
    await prisma.jobAttempt.update({ where:{ id:attempt.id }, data:{ status:'COMPLETED', finishedAt:new Date(), durationMs:Date.now()-startedAt.getTime() } });
    await prisma.job.update({ where:{ id:job.id }, data:{ status:'COMPLETED', result:result as object, completedAt:new Date(), events:{ create:{ eventType:'JOB_COMPLETED', message:'Job completed' } } } });
    return result;
  } catch (err:any) {
    const code = err instanceof AppError ? err.code : 'WORKER_PROCESSING_FAILED';
    await prisma.jobAttempt.update({ where:{ id:attempt.id }, data:{ status:'FAILED', finishedAt:new Date(), durationMs:Date.now()-startedAt.getTime(), errorCode:code, errorMessage:err.message } });
    const final = job.attempts + 1 >= job.maxAttempts;
    await prisma.job.update({ where:{ id:job.id }, data:{ status:final?'DEAD_LETTER':'RETRYING', errorCode:code, errorMessage:err.message, failedAt:new Date(), events:{ create:{ eventType:final?'JOB_DEAD_LETTER':'JOB_RETRYING', message:err.message } } } });
    throw err;
  }
}, { connection, concurrency:env.WORKER_CONCURRENCY });

async function shutdown(signal:string) {
  clearInterval(heartbeat);
  await worker.close();
  await prisma.worker.update({ where:{ name:env.WORKER_NAME }, data:{ status:'STOPPED', lastHeartbeatAt:new Date() } }).catch(()=>undefined);
  await prisma.$disconnect();
  console.log(`Worker stopped by ${signal}`);
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
