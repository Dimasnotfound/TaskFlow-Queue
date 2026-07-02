# TaskFlow Queue

Backend portfolio for asynchronous job processing with Node.js, TypeScript, Fastify, BullMQ, Redis, PostgreSQL, and Prisma.

## Features

- JWT auth with refresh token storage
- RBAC roles: `ADMIN`, `DEVELOPER`, `VIEWER`
- Job creation with idempotency key
- BullMQ queue + separate worker process
- Job attempts, events, audit logs
- Retry and dead-letter status handling
- Queue, worker, health, and metrics endpoints
- Swagger UI at `/docs`

## Local setup

```bat
copy .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
npm run dev:worker
```

Recommended Laragon PATH:

```bat
set PATH=D:\laragon\bin\nodejs\node-v20.19.2-win-x64;D:\laragon\bin\git\cmd;D:\laragon\bin\redis\redis-x64-5.0.14.1;D:\laragon\bin\postgresql\postgresql-14.5-1\bin;%PATH%
```

## Default account

```txt
email: admin@example.com
password: password123
```

## Main endpoints

```txt
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/jobs
GET  /api/v1/jobs
GET  /api/v1/jobs/:id
GET  /api/v1/jobs/:id/attempts
GET  /api/v1/jobs/:id/events
POST /api/v1/jobs/:id/retry
POST /api/v1/jobs/:id/cancel
GET  /api/v1/queues/summary
POST /api/v1/queues/default/pause
POST /api/v1/queues/default/resume
GET  /api/v1/workers
GET  /api/v1/audit-logs
GET  /health
GET  /metrics
```
