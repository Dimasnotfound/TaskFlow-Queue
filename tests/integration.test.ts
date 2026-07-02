import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const describeIntegration = process.env.INTEGRATION_TEST === '1' ? describe : describe.skip;
const auth = (token:string) => ({ authorization: `Bearer ${token}` });

describeIntegration('integration: auth and jobs', () => {
  let app:any;
  let prisma:any;
  let jobQueue:any;
  let adminToken = '';
  let developerToken = '';
  let otherDeveloperToken = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET ??= 'integration-test-access-secret-min-32-chars';
    process.env.JWT_ACCESS_EXPIRES_IN ??= '15m';
    process.env.DEFAULT_QUEUE_NAME ??= 'test-default';
    process.env.WORKER_NAME ??= 'test-worker';
    process.env.WORKER_CONCURRENCY ??= '1';
    process.env.STORAGE_PATH ??= './src/storage';

    const appModule = await import('../src/app.js');
    const prismaModule = await import('../src/config/prisma.js');
    const queueModule = await import('../src/config/queue.js');
    prisma = prismaModule.prisma;
    jobQueue = queueModule.jobQueue;
    app = await appModule.buildApp();
    await app.ready();

    await prisma.jobEvent.deleteMany();
    await prisma.jobAttempt.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.job.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await jobQueue?.close();
    await prisma?.$disconnect();
  });

  it('registers and logs in users', async () => {
    const admin = await app.inject({ method:'POST', url:'/api/v1/auth/register', payload:{ name:'Admin User', email:'admin-it@example.com', password:'password123' } });
    expect(admin.statusCode).toBe(200);
    await prisma.user.update({ where:{ email:'admin-it@example.com' }, data:{ role:'ADMIN' } });

    await app.inject({ method:'POST', url:'/api/v1/auth/register', payload:{ name:'Developer User', email:'dev-it@example.com', password:'password123' } });
    await app.inject({ method:'POST', url:'/api/v1/auth/register', payload:{ name:'Other Developer', email:'other-it@example.com', password:'password123' } });

    const adminLogin = await app.inject({ method:'POST', url:'/api/v1/auth/login', payload:{ email:'admin-it@example.com', password:'password123' } });
    const developerLogin = await app.inject({ method:'POST', url:'/api/v1/auth/login', payload:{ email:'dev-it@example.com', password:'password123' } });
    const otherLogin = await app.inject({ method:'POST', url:'/api/v1/auth/login', payload:{ email:'other-it@example.com', password:'password123' } });

    expect(adminLogin.statusCode).toBe(200);
    expect(developerLogin.statusCode).toBe(200);
    adminToken = adminLogin.json().data.accessToken;
    developerToken = developerLogin.json().data.accessToken;
    otherDeveloperToken = otherLogin.json().data.accessToken;
  });

  it('creates job, rejects invalid payload, and enforces idempotency', async () => {
    const validPayload = { type:'GENERATE_INVOICE', priority:2, maxAttempts:3, payload:{ invoiceId:'INV-IT-001', customerName:'Integration User', items:[{ name:'API Usage', quantity:1, price:1000 }] } };
    const first = await app.inject({ method:'POST', url:'/api/v1/jobs', headers:{ ...auth(developerToken), 'idempotency-key':'it-key-001' }, payload:validPayload });
    expect(first.statusCode).toBe(200);
    const firstJob = first.json().data;
    expect(firstJob.currentQueueJobId).toBeTruthy();

    const duplicate = await app.inject({ method:'POST', url:'/api/v1/jobs', headers:{ ...auth(developerToken), 'idempotency-key':'it-key-001' }, payload:validPayload });
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json().data.id).toBe(firstJob.id);

    const conflict = await app.inject({ method:'POST', url:'/api/v1/jobs', headers:{ ...auth(developerToken), 'idempotency-key':'it-key-001' }, payload:{ ...validPayload, payload:{ ...validPayload.payload, invoiceId:'INV-IT-002' } } });
    expect(conflict.statusCode).toBe(409);

    const invalid = await app.inject({ method:'POST', url:'/api/v1/jobs', headers:auth(developerToken), payload:{ type:'SEND_EMAIL', payload:{ to:'bad-email', subject:'Hi', body:'Body' } } });
    expect(invalid.statusCode).toBe(400);
  });

  it('enforces role visibility and allows admin to see all jobs', async () => {
    const ownJobs = await app.inject({ method:'GET', url:'/api/v1/jobs', headers:auth(developerToken) });
    expect(ownJobs.statusCode).toBe(200);
    expect(ownJobs.json().data.length).toBe(1);

    const otherJobs = await app.inject({ method:'GET', url:'/api/v1/jobs', headers:auth(otherDeveloperToken) });
    expect(otherJobs.statusCode).toBe(200);
    expect(otherJobs.json().data.length).toBe(0);

    const adminJobs = await app.inject({ method:'GET', url:'/api/v1/jobs', headers:auth(adminToken) });
    expect(adminJobs.statusCode).toBe(200);
    expect(adminJobs.json().data.length).toBeGreaterThanOrEqual(1);
  });

  it('manual retry sets job QUEUED and increments manualRetryCount', async () => {
    const job = await prisma.job.findFirstOrThrow({ where:{ createdBy:{ email:'dev-it@example.com' } } });
    await prisma.job.update({ where:{ id:job.id }, data:{ status:'DEAD_LETTER', attempts:3, errorCode:'TEST_FAILED', errorMessage:'test failure' } });

    const retry = await app.inject({ method:'POST', url:`/api/v1/jobs/${job.id}/retry`, headers:auth(developerToken) });
    expect(retry.statusCode).toBe(200);
    expect(retry.json().data.status).toBe('QUEUED');
    expect(retry.json().data.manualRetryCount).toBe(1);
    expect(retry.json().data.attempts).toBe(0);
  });
});
