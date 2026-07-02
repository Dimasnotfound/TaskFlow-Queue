import * as argon2 from 'argon2';
import { JobStatus, JobType, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const users = [
  { name: 'Admin', email: 'admin@example.com', role: Role.ADMIN },
  { name: 'Dimas Developer', email: 'dimas@example.com', role: Role.DEVELOPER },
  { name: 'Queue Viewer', email: 'viewer@example.com', role: Role.VIEWER },
];

const payloads: Record<JobType, object> = {
  GENERATE_INVOICE: { invoiceId: 'INV-SEED', customerName: 'Seed Customer', items: [{ name: 'API Usage', quantity: 2, price: 125000 }] },
  SEND_EMAIL: { to: 'customer@example.com', subject: 'Invoice Ready', body: 'Your invoice has been generated.' },
  SEND_WEBHOOK: { url: 'https://example.com/webhook', event: 'invoice.completed', data: { invoiceId: 'INV-SEED' } },
  EXPORT_REPORT: { reportType: 'JOB_SUMMARY', from: '2026-07-01', to: '2026-07-02' },
};

const statuses = Object.values(JobStatus);
const types = Object.values(JobType);

async function main() {
  const passwordHash = await argon2.hash('password123');
  const seededUsers = await Promise.all(users.map((user) => prisma.user.upsert({
    where: { email: user.email },
    update: { name: user.name, role: user.role },
    create: { ...user, passwordHash },
  })));
  const admin = seededUsers[0];
  const developer = seededUsers[1];

  await prisma.worker.upsert({
    where: { name: 'default-worker-1' },
    update: { status: 'RUNNING', concurrency: 5, lastHeartbeatAt: new Date() },
    create: { name: 'default-worker-1', status: 'RUNNING', concurrency: 5, lastHeartbeatAt: new Date() },
  });

  for (let i = 1; i <= 40; i += 1) {
    const type = types[i % types.length];
    const status = statuses[i % statuses.length];
    const failed = ['FAILED', 'DEAD_LETTER', 'RETRYING'].includes(status);
    const completed = status === 'COMPLETED';
    const cancelled = status === 'CANCELLED';
    const job = await prisma.job.upsert({
      where: { id: `seed_job_${i}` },
      update: {},
      create: {
        id: `seed_job_${i}`,
        type,
        status,
        priority: (i % 5) + 1,
        payload: { ...payloads[type], seedIndex: i },
        payloadHash: `seed_payload_hash_${i}`,
        result: completed ? { ok: true, seedIndex: i } : undefined,
        errorCode: failed ? 'SEED_FAILURE' : undefined,
        errorMessage: failed ? 'Seeded failure for dashboard preview' : undefined,
        attempts: failed ? 3 : completed ? 1 : 0,
        maxAttempts: 3,
        idempotencyKey: `seed-key-${i}`,
        createdById: i % 3 === 0 ? admin.id : developer.id,
        scheduledAt: status === 'DELAYED' ? new Date(Date.now() + 3600_000) : undefined,
        startedAt: ['PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'DEAD_LETTER'].includes(status) ? new Date(Date.now() - 300_000) : undefined,
        completedAt: completed ? new Date(Date.now() - 60_000) : undefined,
        failedAt: failed ? new Date(Date.now() - 120_000) : undefined,
        cancelledAt: cancelled ? new Date(Date.now() - 90_000) : undefined,
      },
    });

    await prisma.idempotencyKey.upsert({
      where: { key: `seed-key-${i}` },
      update: {},
      create: { key: `seed-key-${i}`, requestHash: `seed_request_hash_${i}`, jobId: job.id, createdById: job.createdById },
    });

    await prisma.jobEvent.createMany({
      data: [
        { jobId: job.id, eventType: 'JOB_CREATED', message: 'Seed job created', metadata: { seedIndex: i } },
        ...(completed ? [{ jobId: job.id, eventType: 'JOB_COMPLETED', message: 'Seed job completed', metadata: { seedIndex: i } }] : []),
        ...(failed ? [{ jobId: job.id, eventType: status === 'DEAD_LETTER' ? 'JOB_DEAD_LETTER' : 'JOB_FAILED', message: 'Seed job failed', metadata: { seedIndex: i } }] : []),
      ],
    });

    if (failed || completed) {
      await prisma.jobAttempt.createMany({
        data: Array.from({ length: failed ? 3 : 1 }, (_, index) => ({
          jobId: job.id,
          attemptNumber: index + 1,
          status: failed && index === 2 ? 'FAILED' : completed ? 'COMPLETED' : 'FAILED',
          startedAt: new Date(Date.now() - (index + 1) * 120_000),
          finishedAt: new Date(Date.now() - (index + 1) * 90_000),
          durationMs: 1200 + index * 300,
          errorCode: failed ? 'SEED_FAILURE' : undefined,
          errorMessage: failed ? 'Seeded attempt failure' : undefined,
          workerName: 'default-worker-1',
        })),
      });
    }
  }

  await prisma.auditLog.createMany({
    data: [
      { actorId: admin.id, action: 'SEED_DATABASE', resource: 'system', metadata: { jobs: 40 } },
      { actorId: developer.id, action: 'CREATE_JOB', resource: 'job', resourceId: 'seed_job_1', metadata: { seeded: true } },
    ],
  });
}

main().finally(async () => prisma.$disconnect());
