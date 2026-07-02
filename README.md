# TaskFlow Queue

TaskFlow Queue adalah backend API untuk asynchronous job processing. API menerima request pembuatan job, menyimpan metadata ke PostgreSQL, memasukkan pekerjaan ke BullMQ/Redis, lalu worker terpisah memproses job tersebut di background.

Project ini dibuat sebagai portofolio Node.js Developer: fokus pada TypeScript, backend architecture, distributed job processing, debugging, code review, dan dokumentasi teknis.

## Problem Statement

Tidak semua proses cocok dijalankan langsung di HTTP request. Generate invoice, kirim email, kirim webhook, dan export report bisa lambat, gagal sementara, atau perlu diulang. Jika semua dijalankan langsung, API mudah timeout, retry sulit, dan duplicate request bisa membuat duplicate job.

## Why This Project Matters

Project ini menunjukkan pola production backend: API tetap responsif, worker bisa diskalakan terpisah, failure tercatat, retry bisa dikontrol, dan setiap proses bisa dilacak lewat status, attempts, events, audit logs, dan metrics.

## Tech Stack

- Node.js + TypeScript: runtime dan type safety.
- Fastify: REST API cepat dan ringan.
- PostgreSQL: data permanen untuk users, jobs, attempts, events, audit logs.
- Prisma: schema, migration, seed, dan query type-safe.
- Redis + BullMQ: queue engine untuk background jobs.
- Zod: request validation.
- Argon2: password hashing.
- Swagger: API documentation.
- Vitest: test runner.

## Architecture Overview

```txt
Client / Postman / Reviewer
        |
        v
Fastify API Server
        |
        |-- stores job metadata --> PostgreSQL
        |
        |-- enqueue job ----------> Redis / BullMQ
                                      |
                                      v
                              Worker Process
                                      |
                                      |-- process job by type
                                      |-- write attempts/events/result
                                      v
                                PostgreSQL
```

API server dan worker adalah process terpisah. API menangani HTTP, auth, validation, dan enqueue. Worker mengambil job dari queue dan menjalankan processor.

## Job Lifecycle

```txt
QUEUED       job menunggu diproses
DELAYED      job dijadwalkan dengan delay
PROCESSING   worker sedang memproses job
COMPLETED    job sukses
FAILED       job gagal sementara
RETRYING     job menunggu retry
CANCELLED    job dibatalkan
DEAD_LETTER  job gagal permanen setelah attempts habis
```

## Retry Strategy

BullMQ menjalankan retry otomatis dengan exponential backoff. Manual retry tersedia untuk job `FAILED` dan `DEAD_LETTER`. Manual retry mereset `attempts` ke 0, menaikkan `manualRetryCount`, menyimpan BullMQ job id baru ke `currentQueueJobId`, dan menambah event `JOB_RETRIED`.

## Idempotency Key Design

Create job mendukung `Idempotency-Key`. Request hash dibuat secara canonical agar urutan key object tidak memengaruhi hash.

- Key sama + payload sama: return job lama.
- Key sama + payload beda: return `409 IDEMPOTENCY_CONFLICT`.
- Create job dan idempotency record dibuat di Prisma transaction.
- Setelah transaction sukses, job baru dimasukkan ke BullMQ.
- Jika enqueue gagal, job ditandai `FAILED` dan event `JOB_QUEUE_ADD_FAILED` dibuat.

## Database Schema Overview

Tabel utama:

- `users`: akun dan role.
- `refresh_tokens`: hashed refresh token.
- `jobs`: metadata, payload, status, result, retry fields.
- `job_attempts`: riwayat attempt worker.
- `job_events`: timeline event job.
- `workers`: worker heartbeat dan status.
- `audit_logs`: aktivitas penting.
- `idempotency_keys`: pencegah duplicate job.

## Main API Endpoints

```txt
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me

GET  /api/v1/users
PATCH /api/v1/users/:id/role

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
POST /api/v1/queues/default/clean

GET  /api/v1/workers
GET  /api/v1/workers/:id
GET  /api/v1/dead-letter
GET  /api/v1/audit-logs
GET  /health
GET  /metrics
```

Swagger UI tersedia di:

```txt
http://localhost:4000/docs
```

## Create Job Example

```http
POST /api/v1/jobs
Authorization: Bearer <access_token>
Idempotency-Key: invoice-INV-001
Content-Type: application/json
```

```json
{
  "type": "GENERATE_INVOICE",
  "priority": 2,
  "maxAttempts": 3,
  "delayMs": 0,
  "payload": {
    "invoiceId": "INV-001",
    "customerName": "Dimas Juli Pratama",
    "items": [
      { "name": "API Usage", "quantity": 1, "price": 250000 }
    ]
  }
}
```

Success response:

```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "id": "job_id",
    "type": "GENERATE_INVOICE",
    "status": "QUEUED"
  }
}
```

## Docker Setup for Reviewers

Docker Compose disediakan minimal untuk PostgreSQL dan Redis, agar reviewer mudah menjalankan dependency utama. API dan worker bisa dijalankan dari host.

```bat
copy .env.example .env
docker compose up -d postgres redis
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Terminal kedua:

```bat
npm run dev:worker
```

API:

```txt
http://localhost:4000
```

Health check:

```txt
GET /health
```

## Local Setup without Docker

Jika memakai Laragon atau service lokal:

```bat
copy .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
npm run dev:worker
```

Pastikan PostgreSQL dan Redis aktif sesuai `.env`.

## Default Accounts

Seed membuat akun berikut:

```txt
admin@example.com  / password123 / ADMIN
dimas@example.com  / password123 / DEVELOPER
viewer@example.com / password123 / VIEWER
```

## Security Considerations

- Password di-hash dengan Argon2.
- Access token memakai JWT.
- Refresh token disimpan sebagai hash.
- Admin-only route dilindungi RBAC.
- Request body divalidasi dengan Zod.
- Webhook hanya mengizinkan HTTPS dan menolak localhost, 127.0.0.1, 0.0.0.0, dan 169.254.169.254.
- Stack trace tidak dikirim ke user.

## Testing Strategy

Test ringan tersedia untuk hash, auth schema, job payload validation, idempotency hash, dan worker computed status. Test integration DB/Redis bisa ditambah nanti:

- auth register/login via `app.inject`
- create job valid dan invalid
- idempotency conflict
- role access control
- manual retry behavior
- worker processing flow

Run:

```bat
npm run build
npm run test
```

## Technical Trade-offs

- Invoice demo dibuat sebagai `.txt`, bukan PDF sungguhan, agar dependency tetap ringan.
- Email masih simulasi, bukan SMTP sungguhan.
- Metrics masih JSON sederhana, bukan Prometheus format.
- Docker Compose minimal menjalankan PostgreSQL dan Redis; full app Docker bisa ditambahkan nanti.
- Integration test DB/Redis belum dibuat agar setup test tetap sederhana.

## Future Improvements

- Tambah integration tests dengan PostgreSQL dan Redis test services.
- GitHub Actions basic CI sudah tersedia untuk `npm ci`, Prisma generate, build, dan test. Service PostgreSQL/Redis bisa ditambah jika integration test DB/Redis dibuat.
- Tambah Prometheus metrics memakai `prom-client`.
- Tambah real email provider atau Mailpit.
- Tambah PDF generation dengan `pdfkit`.
- Tambah worker stale status computation di module workers.
