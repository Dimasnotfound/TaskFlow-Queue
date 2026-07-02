# TaskFlow Queue

## 1. Ringkasan Proyek

**TaskFlow Queue** adalah aplikasi backend berbasis **Node.js, TypeScript, Redis, BullMQ, PostgreSQL, dan Prisma** untuk membuat, menjalankan, memantau, mengulang, membatalkan, dan menganalisis pekerjaan background atau asynchronous job.

Proyek ini dibuat sebagai portofolio untuk posisi **Node.js Developer** yang membutuhkan kemampuan dalam:

- Node.js
- JavaScript
- TypeScript
- backend architecture
- distributed application system
- debugging
- code review
- dokumentasi teknis
- error handling
- queue processing
- retry strategy
- observability
- testing

Aplikasi ini bukan CRUD biasa. Fokus utamanya adalah membuktikan bahwa developer memahami bagaimana proses berat dipisahkan dari request utama, bagaimana job diproses oleh worker, bagaimana sistem menangani kegagalan, dan bagaimana setiap proses dapat ditelusuri melalui status, attempt log, audit log, dan metrics.

---

## 2. Masalah yang Diselesaikan

Dalam aplikasi backend nyata, tidak semua proses cocok dijalankan langsung di dalam request HTTP. Beberapa proses bisa memakan waktu lama, mudah gagal, atau perlu dijalankan ulang jika terjadi error sementara.

Contoh proses tersebut:

- generate invoice PDF
- mengirim email
- mengirim webhook
- export laporan CSV
- sinkronisasi data ke service eksternal
- resize image
- proses pembayaran simulasi
- cetak struk
- notifikasi reminder

Jika semua proses tersebut dijalankan langsung di request HTTP, masalah yang muncul adalah:

- response API menjadi lambat
- request bisa timeout
- proses gagal sulit diulang
- error sulit dilacak
- beban server menjadi tidak stabil
- tidak ada riwayat attempt
- tidak ada mekanisme retry
- client bisa membuat duplicate job saat request diulang

TaskFlow Queue menyelesaikan masalah tersebut dengan cara:

1. API hanya menerima request dan membuat job.
2. Job dimasukkan ke queue.
3. Worker mengambil job dari queue.
4. Worker memproses job secara asynchronous.
5. Status job disimpan ke database.
6. Setiap attempt dicatat.
7. Job gagal dapat retry otomatis.
8. Job gagal permanen masuk dead letter queue.
9. Admin atau developer bisa melihat semua proses dari dashboard atau API.

---

## 3. Tujuan Proyek

Tujuan utama proyek ini adalah membangun sistem job queue yang rapi, scalable, dan mudah diamati.

Tujuan teknis:

- Membuat REST API dengan Node.js dan TypeScript.
- Menggunakan Redis sebagai queue storage.
- Menggunakan BullMQ sebagai job queue engine.
- Menggunakan PostgreSQL untuk menyimpan data aplikasi.
- Menggunakan Prisma untuk database schema, migration, dan query type-safe.
- Menyediakan worker process yang berjalan terpisah dari API server.
- Menyediakan retry mechanism dengan backoff.
- Menyediakan idempotency key untuk mencegah duplicate job.
- Menyediakan job attempt logs untuk debugging.
- Menyediakan dead letter queue untuk job yang gagal permanen.
- Menyediakan audit log untuk traceability.
- Menyediakan API documentation.
- Menyediakan testing unit, integration, dan end-to-end.
- Menyediakan Docker Compose agar proyek mudah dijalankan.

Tujuan portofolio:

- Menunjukkan pemahaman backend production-style.
- Menunjukkan kemampuan menulis TypeScript yang rapi.
- Menunjukkan kemampuan mendesain database.
- Menunjukkan kemampuan membagi aplikasi menjadi module.
- Menunjukkan pemahaman asynchronous processing.
- Menunjukkan kemampuan menjelaskan technical trade-off.
- Menunjukkan kemampuan dokumentasi teknis.

---

## 4. Gambaran Sistem

### 4.1 Alur Utama

```txt
Client / Web Dashboard / Postman
        |
        v
Fastify API Server
        |
        | 1. validasi request
        | 2. simpan job ke PostgreSQL
        | 3. kirim job ke BullMQ
        v
Redis Queue
        |
        v
Worker Process
        |
        | 1. ambil job dari queue
        | 2. ubah status menjadi processing
        | 3. proses job sesuai type
        | 4. simpan attempt log
        | 5. simpan result atau error
        v
PostgreSQL Database
        |
        v
Dashboard menampilkan status terbaru
```

### 4.2 Pemisahan Tanggung Jawab

Aplikasi dibagi menjadi beberapa proses:

```txt
API Server
- menerima request HTTP
- validasi input
- authentication dan authorization
- membuat job
- membaca status job
- melakukan retry atau cancel
- menyediakan API documentation

Worker Server
- mengambil job dari queue
- menjalankan proses sesuai jenis job
- mencatat attempt
- mengubah status job
- menangani error

Database
- menyimpan user
- menyimpan job
- menyimpan job attempt
- menyimpan audit log
- menyimpan idempotency key

Redis
- menyimpan queue state
- mengatur waiting jobs
- mengatur active jobs
- mengatur delayed jobs
- membantu retry dan backoff
```

---

## 5. Fitur Utama

## 5.1 Authentication

Fitur authentication digunakan agar sistem tidak bisa diakses bebas.

Fitur:

- register user
- login user
- logout user
- refresh token
- password hashing
- role-based access control

Role:

```txt
ADMIN
DEVELOPER
VIEWER
```

Hak akses:

```txt
ADMIN
- melihat semua job
- membuat job
- retry job
- cancel job
- melihat audit log
- melihat semua user
- mengubah role user
- melihat metrics

DEVELOPER
- membuat job
- melihat job miliknya
- retry job miliknya
- cancel job miliknya jika status masih queued atau delayed
- melihat attempt log job miliknya

VIEWER
- hanya melihat job
- tidak bisa membuat, retry, atau cancel job
```

---

## 5.2 Create Job

User dapat membuat job melalui API atau dashboard.

Data yang dikirim:

```json
{
  "type": "GENERATE_INVOICE",
  "priority": 2,
  "maxAttempts": 3,
  "delayMs": 0,
  "idempotencyKey": "invoice-INV-001",
  "payload": {
    "invoiceId": "INV-001",
    "customerName": "Dimas Juli Pratama",
    "amount": 250000
  }
}
```

Keterangan field:

```txt
type
- jenis job yang akan dijalankan

priority
- prioritas job
- angka lebih kecil bisa dianggap prioritas lebih tinggi, tergantung konfigurasi queue

maxAttempts
- batas maksimal percobaan

delayMs
- waktu tunggu sebelum job boleh diproses

idempotencyKey
- key unik untuk mencegah duplicate job

payload
- data utama yang dibutuhkan worker
```

---

## 5.3 Job Types

Untuk MVP, gunakan empat job type.

```txt
GENERATE_INVOICE
SEND_EMAIL
SEND_WEBHOOK
EXPORT_REPORT
```

### 5.3.1 GENERATE_INVOICE

Job untuk membuat invoice sederhana.

Payload:

```json
{
  "invoiceId": "INV-001",
  "customerName": "Dimas Juli Pratama",
  "items": [
    {
      "name": "API Usage",
      "quantity": 1,
      "price": 250000
    }
  ]
}
```

Result:

```json
{
  "invoiceId": "INV-001",
  "total": 250000,
  "filePath": "/storage/invoices/INV-001.pdf"
}
```

Catatan:

- Untuk MVP, file PDF bisa berupa file dummy.
- Untuk versi advanced, gunakan package PDF generator.

### 5.3.2 SEND_EMAIL

Job untuk simulasi pengiriman email.

Payload:

```json
{
  "to": "user@example.com",
  "subject": "Invoice Ready",
  "body": "Your invoice has been generated."
}
```

Result:

```json
{
  "messageId": "email_123456",
  "sentAt": "2026-07-02T10:00:00.000Z"
}
```

Catatan:

- Untuk MVP, email tidak harus benar-benar dikirim.
- Worker cukup membuat messageId simulasi.
- Untuk advanced, bisa integrasi dengan SMTP test server seperti Mailpit.

### 5.3.3 SEND_WEBHOOK

Job untuk mengirim HTTP request ke URL tertentu.

Payload:

```json
{
  "url": "https://example.com/webhook",
  "event": "invoice.completed",
  "data": {
    "invoiceId": "INV-001"
  }
}
```

Result:

```json
{
  "statusCode": 200,
  "deliveredAt": "2026-07-02T10:00:00.000Z"
}
```

Catatan:

- Gunakan timeout agar worker tidak menggantung terlalu lama.
- Simpan statusCode dan response singkat.
- Jangan simpan response body terlalu besar.

### 5.3.4 EXPORT_REPORT

Job untuk membuat laporan CSV sederhana.

Payload:

```json
{
  "reportType": "JOB_SUMMARY",
  "from": "2026-07-01",
  "to": "2026-07-02"
}
```

Result:

```json
{
  "filePath": "/storage/reports/job-summary-2026-07-02.csv",
  "rows": 120
}
```

---

## 5.4 Job Status Tracking

Setiap job harus memiliki status yang jelas.

Status yang digunakan:

```txt
QUEUED
DELAYED
PROCESSING
COMPLETED
FAILED
RETRYING
CANCELLED
DEAD_LETTER
```

Penjelasan:

```txt
QUEUED
- job sudah dibuat dan menunggu diproses

DELAYED
- job sudah dibuat tetapi belum boleh diproses karena memiliki delay

PROCESSING
- job sedang diproses oleh worker

COMPLETED
- job selesai dengan sukses

FAILED
- job gagal, tetapi belum tentu masuk dead letter

RETRYING
- job sedang menunggu percobaan ulang

CANCELLED
- job dibatalkan oleh user atau admin

DEAD_LETTER
- job gagal permanen setelah semua attempt habis
```

---

## 5.5 Retry Mechanism

Retry digunakan untuk error sementara.

Contoh error sementara:

- webhook target timeout
- service eksternal mengembalikan HTTP 500
- koneksi network gagal
- Redis atau database sempat tidak stabil

Konfigurasi retry:

```txt
maxAttempts: 3
backoffType: exponential
initialDelayMs: 5000
```

Contoh alur retry:

```txt
Attempt 1 gagal
Tunggu 5 detik
Attempt 2 gagal
Tunggu 30 detik
Attempt 3 gagal
Job masuk DEAD_LETTER
```

Aturan penting:

- Jangan retry error validasi payload.
- Jangan retry error authorization.
- Retry hanya untuk error yang kemungkinan sementara.
- Semua attempt harus dicatat.

---

## 5.6 Idempotency Key

Idempotency key digunakan untuk mencegah duplicate job.

Masalah yang diselesaikan:

```txt
Client membuat job.
Server berhasil membuat job.
Koneksi client timeout.
Client mengirim request ulang.
Tanpa idempotency key, job akan dibuat dua kali.
```

Solusi:

```txt
Client mengirim Idempotency-Key.
Server mengecek apakah key tersebut sudah pernah digunakan.
Jika sudah ada, server mengembalikan job yang sama.
Jika belum ada, server membuat job baru.
```

Header:

```txt
Idempotency-Key: invoice-INV-001
```

Aturan:

- idempotency key bersifat unik per user.
- kombinasi userId dan idempotencyKey harus unique.
- jika payload berbeda tetapi idempotency key sama, server mengembalikan error conflict.

---

## 5.7 Job Attempt Logs

Setiap percobaan pemrosesan job harus dicatat.

Contoh attempt log:

```txt
Attempt 1
Status: FAILED
Started at: 10:00:01
Finished at: 10:00:04
Duration: 3000 ms
Error: Target service returned HTTP 500

Attempt 2
Status: FAILED
Started at: 10:00:34
Finished at: 10:00:36
Duration: 2000 ms
Error: Request timeout

Attempt 3
Status: COMPLETED
Started at: 10:02:00
Finished at: 10:02:03
Duration: 3000 ms
```

Manfaat:

- developer bisa debug failure
- admin bisa melihat riwayat retry
- sistem menjadi transparan
- cocok untuk technical explanation di interview

---

## 5.8 Dead Letter Queue

Dead letter queue digunakan untuk menyimpan job yang gagal permanen.

Job masuk dead letter jika:

- semua retry sudah habis
- error tidak bisa dipulihkan
- payload invalid ditemukan saat processing
- worker gagal berulang kali

Data yang ditampilkan:

```txt
job id
type
final error
total attempts
failed at
payload
created by
```

Action:

```txt
retry manually
mark as resolved
view detail
```

---

## 5.9 Cancel Job

User dapat membatalkan job jika job belum diproses.

Job yang bisa dibatalkan:

```txt
QUEUED
DELAYED
RETRYING
```

Job yang tidak boleh dibatalkan:

```txt
PROCESSING
COMPLETED
FAILED
DEAD_LETTER
```

Catatan:

- Untuk membatalkan job yang sedang processing, sistem perlu cancellation token atau cooperative cancellation.
- Untuk MVP, cukup batalkan job yang belum aktif.

---

## 5.10 Queue Monitoring

Queue monitoring menampilkan kondisi antrean.

Data:

```txt
waiting jobs
active jobs
completed jobs
failed jobs
delayed jobs
paused status
worker count
throughput per minute
average processing time
```

Action admin:

```txt
pause queue
resume queue
clean completed jobs
clean failed jobs
```

Untuk MVP:

- tampilkan queue summary saja
- pause dan resume bisa ditambahkan setelah fitur utama selesai

---

## 5.11 Worker Monitoring

Worker monitoring menunjukkan status worker.

Data:

```txt
worker name
status
last heartbeat
active job id
processed jobs
failed jobs
concurrency
started at
memory usage
```

Status worker:

```txt
ONLINE
OFFLINE
IDLE
BUSY
```

Cara implementasi:

- worker mengirim heartbeat berkala ke database
- dashboard membaca data worker dari database
- jika heartbeat terlalu lama, worker dianggap offline

---

## 5.12 Audit Log

Audit log mencatat aktivitas penting.

Contoh aktivitas:

```txt
USER_REGISTERED
USER_LOGIN
JOB_CREATED
JOB_STARTED
JOB_COMPLETED
JOB_FAILED
JOB_RETRIED
JOB_CANCELLED
JOB_MOVED_TO_DEAD_LETTER
QUEUE_PAUSED
QUEUE_RESUMED
```

Manfaat:

- traceability
- debugging
- keamanan
- pembuktian alur sistem

---

## 5.13 Metrics dan Health Check

Endpoint health check:

```txt
GET /health
```

Response:

```json
{
  "status": "ok",
  "api": "ok",
  "database": "ok",
  "redis": "ok",
  "timestamp": "2026-07-02T10:00:00.000Z"
}
```

Endpoint metrics:

```txt
GET /metrics
```

Data yang ditampilkan:

```txt
total jobs
completed jobs
failed jobs
dead letter jobs
average duration
success rate
failure rate
active workers
queue waiting count
queue active count
```

---

## 6. Fitur Web Dashboard

Web dashboard tidak wajib untuk backend portfolio, tetapi sangat membantu agar proyek terlihat lengkap.

Halaman web:

```txt
/login
/register
/dashboard
/jobs
/jobs/create
/jobs/:id
/queues
/workers
/dead-letter
/audit-logs
/api-docs
/settings
```

### 6.1 Dashboard Page

Menampilkan ringkasan sistem:

```txt
total jobs
queued jobs
processing jobs
completed jobs
failed jobs
dead letter jobs
success rate
average duration
worker status
queue status
```

### 6.2 Jobs Page

Menampilkan daftar job.

Kolom:

```txt
job id
type
status
priority
attempts
created by
created at
updated at
duration
action
```

Filter:

```txt
status
type
date range
created by
search by job id
search by idempotency key
```

### 6.3 Create Job Page

Form:

```txt
job type
priority
max attempts
delay
idempotency key
payload JSON
```

Fitur penting:

- JSON editor
- payload validation
- preview payload
- submit job

### 6.4 Job Detail Page

Menampilkan:

```txt
job metadata
payload
result
error message
attempt logs
audit timeline
retry button
cancel button
copy job id
copy payload
```

### 6.5 Queue Page

Menampilkan:

```txt
waiting
active
completed
failed
delayed
paused status
```

### 6.6 Worker Page

Menampilkan:

```txt
worker name
status
last heartbeat
active job
concurrency
processed count
failed count
```

### 6.7 Dead Letter Page

Menampilkan semua job yang gagal permanen.

Action:

```txt
retry manually
mark as resolved
view detail
```

### 6.8 Audit Logs Page

Menampilkan aktivitas sistem.

Filter:

```txt
action
actor
entity type
date range
```

---

## 7. Tech Stack

## 7.1 Backend Runtime

```txt
Node.js
```

Alasan:

- cocok untuk aplikasi I/O-heavy
- ekosistem package besar
- cocok untuk API dan worker
- relevan dengan posisi Node.js Developer

## 7.2 Bahasa

```txt
TypeScript
```

Alasan:

- type safety
- mudah refactor
- mengurangi bug runtime
- cocok untuk backend besar
- sesuai requirement pekerjaan

## 7.3 Web Framework

```txt
Fastify
```

Alasan:

- ringan
- performa baik
- plugin architecture jelas
- cocok untuk API server
- mendukung schema validation

## 7.4 Database

```txt
PostgreSQL
```

Alasan:

- relational database stabil
- cocok untuk transaksi
- cocok untuk data job, user, log, dan audit
- mendukung JSONB untuk payload dan result

## 7.5 ORM

```txt
Prisma
```

Alasan:

- type-safe database client
- migration mudah
- schema database jelas
- cocok untuk TypeScript

## 7.6 Queue

```txt
BullMQ
```

Alasan:

- queue library untuk Node.js
- berbasis Redis
- mendukung delayed job
- mendukung retry
- mendukung worker concurrency
- cocok untuk background job processing

## 7.7 Queue Storage

```txt
Redis
```

Alasan:

- cepat
- cocok untuk queue state
- digunakan oleh BullMQ
- cocok untuk distributed worker

## 7.8 Validation

```txt
Zod
```

Alasan:

- schema validation berbasis TypeScript
- bisa digunakan untuk request body, query, params, dan env validation
- membantu menjaga input tetap aman

## 7.9 Logging

```txt
Pino
```

Alasan:

- logger cepat
- cocok dengan Fastify
- output JSON cocok untuk production log

## 7.10 Testing

```txt
Vitest
```

Alasan:

- cepat
- cocok dengan TypeScript
- syntax familiar
- cocok untuk unit dan integration test

## 7.11 Container

```txt
Docker
Docker Compose
```

Alasan:

- mudah menjalankan PostgreSQL dan Redis
- environment konsisten
- cocok untuk dokumentasi portofolio

---

## 8. Package yang Digunakan

## 8.1 Dependencies

```json
{
  "dependencies": {
    "@fastify/cors": "latest",
    "@fastify/helmet": "latest",
    "@fastify/jwt": "latest",
    "@fastify/rate-limit": "latest",
    "@fastify/swagger": "latest",
    "@fastify/swagger-ui": "latest",
    "@fastify/static": "latest",
    "@prisma/client": "latest",
    "argon2": "latest",
    "bullmq": "latest",
    "dotenv": "latest",
    "fastify": "latest",
    "ioredis": "latest",
    "nanoid": "latest",
    "pino": "latest",
    "zod": "latest"
  }
}
```

Penjelasan:

```txt
fastify
- framework utama untuk REST API

@fastify/cors
- mengatur CORS jika dashboard frontend berbeda origin

@fastify/helmet
- menambahkan security headers

@fastify/jwt
- membuat dan memverifikasi JWT

@fastify/rate-limit
- membatasi request agar API tidak mudah disalahgunakan

@fastify/swagger
- membuat OpenAPI specification

@fastify/swagger-ui
- menampilkan dokumentasi API dalam UI

@fastify/static
- menyajikan file statis seperti invoice PDF atau report CSV

@prisma/client
- client untuk query database

argon2
- hashing password

bullmq
- queue dan worker engine

dotenv
- membaca file .env

fastify
- HTTP server framework

ioredis
- koneksi Redis untuk BullMQ

nanoid
- membuat ID unik yang pendek dan aman

pino
- logging JSON

zod
- validasi request, env, dan payload
```

## 8.2 Dev Dependencies

```json
{
  "devDependencies": {
    "@types/node": "latest",
    "prisma": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

Penjelasan:

```txt
typescript
- compiler TypeScript

tsx
- menjalankan TypeScript langsung saat development

vitest
- testing framework

prisma
- Prisma CLI untuk migration dan generate client

@types/node
- type definition untuk Node.js
```

## 8.3 Optional Package untuk Advanced Feature

```json
{
  "optionalDependenciesForFuture": {
    "pdfkit": "generate PDF invoice",
    "nodemailer": "mengirim email sungguhan atau lewat SMTP test server",
    "prom-client": "Prometheus metrics",
    "csv-stringify": "membuat file CSV",
    "supertest": "HTTP integration testing",
    "eslint": "linting",
    "prettier": "formatting"
  }
}
```

Catatan:

- Optional package tidak wajib untuk MVP.
- Tambahkan hanya jika fitur terkait benar-benar dibuat.

---

## 9. Struktur Folder Lengkap

Struktur folder yang direkomendasikan:

```txt
taskflow-queue/
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   ├── worker-flow.md
│   └── trade-offs.md
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── worker.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   ├── queue.ts
│   │   └── logger.ts
│   │
│   ├── constants/
│   │   ├── job-status.constant.ts
│   │   ├── job-type.constant.ts
│   │   ├── role.constant.ts
│   │   └── queue-name.constant.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── users/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.schema.ts
│   │   │   └── user.types.ts
│   │   │
│   │   ├── jobs/
│   │   │   ├── job.controller.ts
│   │   │   ├── job.routes.ts
│   │   │   ├── job.service.ts
│   │   │   ├── job.repository.ts
│   │   │   ├── job.schema.ts
│   │   │   ├── job.types.ts
│   │   │   └── job.mapper.ts
│   │   │
│   │   ├── attempts/
│   │   │   ├── attempt.controller.ts
│   │   │   ├── attempt.routes.ts
│   │   │   ├── attempt.service.ts
│   │   │   ├── attempt.repository.ts
│   │   │   └── attempt.schema.ts
│   │   │
│   │   ├── queues/
│   │   │   ├── queue.controller.ts
│   │   │   ├── queue.routes.ts
│   │   │   ├── queue.service.ts
│   │   │   └── queue.schema.ts
│   │   │
│   │   ├── workers/
│   │   │   ├── worker.controller.ts
│   │   │   ├── worker.routes.ts
│   │   │   ├── worker.service.ts
│   │   │   ├── worker.repository.ts
│   │   │   └── worker.schema.ts
│   │   │
│   │   ├── audit-logs/
│   │   │   ├── audit-log.controller.ts
│   │   │   ├── audit-log.routes.ts
│   │   │   ├── audit-log.service.ts
│   │   │   ├── audit-log.repository.ts
│   │   │   └── audit-log.schema.ts
│   │   │
│   │   ├── metrics/
│   │   │   ├── metrics.controller.ts
│   │   │   ├── metrics.routes.ts
│   │   │   └── metrics.service.ts
│   │   │
│   │   └── health/
│   │       ├── health.controller.ts
│   │       ├── health.routes.ts
│   │       └── health.service.ts
│   │
│   ├── queues/
│   │   ├── default.queue.ts
│   │   ├── queue.factory.ts
│   │   └── queue.events.ts
│   │
│   ├── processors/
│   │   ├── index.ts
│   │   ├── generate-invoice.processor.ts
│   │   ├── send-email.processor.ts
│   │   ├── send-webhook.processor.ts
│   │   └── export-report.processor.ts
│   │
│   ├── workers/
│   │   ├── default.worker.ts
│   │   ├── heartbeat.worker.ts
│   │   └── worker-events.ts
│   │
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── app-error.ts
│   │   │   ├── error-code.ts
│   │   │   ├── error-handler.ts
│   │   │   └── http-error.ts
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── role.middleware.ts
│   │   │   ├── request-id.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── date.util.ts
│   │   │   ├── hash.util.ts
│   │   │   ├── id.util.ts
│   │   │   ├── json.util.ts
│   │   │   └── retry.util.ts
│   │   │
│   │   └── types/
│   │       ├── api-response.type.ts
│   │       ├── pagination.type.ts
│   │       └── request-user.type.ts
│   │
│   └── storage/
│       ├── invoices/
│       └── reports/
│
├── tests/
│   ├── unit/
│   │   ├── auth.service.test.ts
│   │   ├── job.service.test.ts
│   │   ├── retry.util.test.ts
│   │   └── payload-validation.test.ts
│   │
│   ├── integration/
│   │   ├── auth.routes.test.ts
│   │   ├── job.routes.test.ts
│   │   ├── queue.routes.test.ts
│   │   └── worker-processing.test.ts
│   │
│   └── e2e/
│       ├── create-job-flow.test.ts
│       ├── retry-job-flow.test.ts
│       └── dead-letter-flow.test.ts
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
└── projek.md
```

---

## 10. Penjelasan Folder dan File

## 10.1 Root Folder

```txt
package.json
- daftar package, scripts, dan metadata proyek

tsconfig.json
- konfigurasi TypeScript

.env.example
- contoh environment variable

docker-compose.yml
- menjalankan PostgreSQL dan Redis secara lokal

Dockerfile
- konfigurasi container aplikasi

README.md
- dokumentasi utama untuk GitHub

projek.md
- dokumen blueprint proyek lengkap
```

## 10.2 Folder docs

```txt
docs/architecture.md
- menjelaskan arsitektur sistem

docs/api.md
- daftar endpoint dan contoh request response

docs/database.md
- penjelasan tabel dan relasi database

docs/worker-flow.md
- alur worker dari job diterima sampai selesai

docs/trade-offs.md
- penjelasan keputusan teknis dan trade-off
```

## 10.3 Folder prisma

```txt
prisma/schema.prisma
- definisi database schema

prisma/seed.ts
- data awal seperti admin user dan contoh job
```

## 10.4 Folder src/config

```txt
env.ts
- membaca dan memvalidasi environment variable

prisma.ts
- membuat Prisma Client singleton

redis.ts
- membuat koneksi Redis

queue.ts
- konfigurasi queue default

logger.ts
- konfigurasi logger Pino
```

## 10.5 Folder src/modules

Folder ini berisi module utama aplikasi.

Pola file per module:

```txt
*.routes.ts
- mendefinisikan endpoint

*.controller.ts
- mengambil request dan mengembalikan response

*.service.ts
- berisi business logic

*.repository.ts
- berisi query database

*.schema.ts
- berisi validasi Zod

*.types.ts
- berisi type khusus module

*.mapper.ts
- mengubah data database menjadi response DTO
```

## 10.6 Folder src/processors

Folder ini berisi logic pemrosesan job.

```txt
generate-invoice.processor.ts
- memproses job GENERATE_INVOICE

send-email.processor.ts
- memproses job SEND_EMAIL

send-webhook.processor.ts
- memproses job SEND_WEBHOOK

export-report.processor.ts
- memproses job EXPORT_REPORT

index.ts
- memilih processor berdasarkan job type
```

## 10.7 Folder src/workers

Folder ini berisi proses worker.

```txt
default.worker.ts
- worker utama yang mengambil job dari queue

heartbeat.worker.ts
- mencatat heartbeat worker ke database

worker-events.ts
- menangani event completed, failed, stalled, dan active
```

## 10.8 Folder src/shared

Berisi kode yang digunakan banyak module.

```txt
errors/
- custom error dan global error handler

middlewares/
- middleware auth, role, request id, dan validation

utils/
- helper umum

types/
- type umum untuk response, pagination, dan request user
```

---

## 11. Naming Convention

## 11.1 Folder

Gunakan lowercase dan kebab-case.

Contoh:

```txt
audit-logs
job-attempts
queue-events
```

## 11.2 File

Gunakan kebab-case dan suffix sesuai fungsi.

Contoh:

```txt
job.controller.ts
job.service.ts
job.repository.ts
job.routes.ts
job.schema.ts
job.types.ts
job.mapper.ts
```

## 11.3 Class

Gunakan PascalCase.

Contoh:

```ts
class JobService {}
class JobRepository {}
class AuditLogService {}
```

## 11.4 Function

Gunakan camelCase.

Contoh:

```ts
createJob()
retryJob()
cancelJob()
getJobById()
```

## 11.5 Constant

Gunakan UPPER_SNAKE_CASE untuk constant global.

Contoh:

```ts
const DEFAULT_QUEUE_NAME = 'default';
const MAX_PAYLOAD_SIZE = 1024 * 100;
```

## 11.6 Enum Value

Gunakan UPPER_SNAKE_CASE.

Contoh:

```txt
QUEUED
PROCESSING
COMPLETED
DEAD_LETTER
```

---

## 12. Database Design

Database menggunakan PostgreSQL.

Tabel utama:

```txt
users
refresh_tokens
jobs
job_attempts
job_events
workers
audit_logs
idempotency_keys
```

---

## 12.1 Tabel users

Menyimpan data user.

Kolom:

```txt
id
name
email
password_hash
role
is_active
created_at
updated_at
```

Fungsi:

- authentication
- authorization
- mengetahui pemilik job

---

## 12.2 Tabel refresh_tokens

Menyimpan refresh token aktif.

Kolom:

```txt
id
user_id
token_hash
expires_at
revoked_at
created_at
```

Fungsi:

- refresh access token
- logout
- revoke token

---

## 12.3 Tabel jobs

Menyimpan data utama job.

Kolom:

```txt
id
type
status
priority
payload
payload_hash
result
error_code
error_message
attempts
max_attempts
idempotency_key
created_by_id
scheduled_at
started_at
completed_at
failed_at
cancelled_at
created_at
updated_at
```

Fungsi:

- menyimpan lifecycle job
- menyimpan payload
- menyimpan result
- menyimpan error terakhir
- menyimpan status terbaru

---

## 12.4 Tabel job_attempts

Menyimpan riwayat percobaan job.

Kolom:

```txt
id
job_id
attempt_number
status
started_at
finished_at
duration_ms
error_code
error_message
worker_name
created_at
```

Fungsi:

- debugging
- melihat retry history
- menghitung durasi pemrosesan

---

## 12.5 Tabel job_events

Menyimpan timeline event per job.

Kolom:

```txt
id
job_id
event_type
message
metadata
created_at
```

Contoh event:

```txt
JOB_CREATED
JOB_QUEUED
JOB_STARTED
JOB_FAILED
JOB_RETRYING
JOB_COMPLETED
JOB_CANCELLED
JOB_MOVED_TO_DEAD_LETTER
```

---

## 12.6 Tabel workers

Menyimpan status worker.

Kolom:

```txt
id
name
status
concurrency
active_job_id
processed_count
failed_count
last_heartbeat_at
started_at
created_at
updated_at
```

Fungsi:

- worker monitoring
- mendeteksi worker offline
- melihat performa worker

---

## 12.7 Tabel audit_logs

Menyimpan audit aktivitas sistem.

Kolom:

```txt
id
actor_id
action
entity_type
entity_id
metadata
ip_address
user_agent
created_at
```

Fungsi:

- traceability
- keamanan
- riwayat aktivitas admin dan user

---

## 12.8 Tabel idempotency_keys

Menyimpan key untuk mencegah duplicate request.

Kolom:

```txt
id
user_id
key
request_hash
job_id
created_at
expires_at
```

Aturan unique:

```txt
user_id + key harus unique
```

Fungsi:

- mencegah duplicate job
- memastikan request ulang mengembalikan job yang sama

---

## 13. Prisma Schema

Contoh awal `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  DEVELOPER
  VIEWER
}

enum JobType {
  GENERATE_INVOICE
  SEND_EMAIL
  SEND_WEBHOOK
  EXPORT_REPORT
}

enum JobStatus {
  QUEUED
  DELAYED
  PROCESSING
  COMPLETED
  FAILED
  RETRYING
  CANCELLED
  DEAD_LETTER
}

enum AttemptStatus {
  PROCESSING
  COMPLETED
  FAILED
}

enum WorkerStatus {
  ONLINE
  OFFLINE
  IDLE
  BUSY
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         UserRole @default(DEVELOPER)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  jobs             Job[]
  refreshTokens    RefreshToken[]
  auditLogs        AuditLog[]
  idempotencyKeys  IdempotencyKey[]

  @@map("users")
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  tokenHash String    @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model Job {
  id             String    @id @default(cuid())
  type           JobType
  status         JobStatus @default(QUEUED)
  priority       Int       @default(3)
  payload        Json
  payloadHash    String    @map("payload_hash")
  result         Json?
  errorCode      String?   @map("error_code")
  errorMessage   String?   @map("error_message")
  attempts       Int       @default(0)
  maxAttempts    Int       @default(3) @map("max_attempts")
  idempotencyKey String?   @map("idempotency_key")
  createdById    String    @map("created_by_id")
  scheduledAt    DateTime? @map("scheduled_at")
  startedAt      DateTime? @map("started_at")
  completedAt    DateTime? @map("completed_at")
  failedAt       DateTime? @map("failed_at")
  cancelledAt    DateTime? @map("cancelled_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  createdBy User @relation(fields: [createdById], references: [id])
  attemptsLog JobAttempt[]
  events JobEvent[]
  idempotencyRecord IdempotencyKey?

  @@index([status])
  @@index([type])
  @@index([createdById])
  @@index([createdAt])
  @@map("jobs")
}

model JobAttempt {
  id            String        @id @default(cuid())
  jobId         String        @map("job_id")
  attemptNumber Int           @map("attempt_number")
  status        AttemptStatus
  startedAt     DateTime      @map("started_at")
  finishedAt    DateTime?     @map("finished_at")
  durationMs    Int?          @map("duration_ms")
  errorCode     String?       @map("error_code")
  errorMessage  String?       @map("error_message")
  workerName    String?       @map("worker_name")
  createdAt     DateTime      @default(now()) @map("created_at")

  job Job @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@index([status])
  @@map("job_attempts")
}

model JobEvent {
  id        String   @id @default(cuid())
  jobId     String   @map("job_id")
  eventType String   @map("event_type")
  message   String?
  metadata  Json?
  createdAt DateTime @default(now()) @map("created_at")

  job Job @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@index([eventType])
  @@map("job_events")
}

model WorkerNode {
  id              String       @id @default(cuid())
  name            String       @unique
  status          WorkerStatus @default(ONLINE)
  concurrency     Int          @default(5)
  activeJobId     String?      @map("active_job_id")
  processedCount  Int          @default(0) @map("processed_count")
  failedCount     Int          @default(0) @map("failed_count")
  lastHeartbeatAt DateTime?    @map("last_heartbeat_at")
  startedAt       DateTime     @default(now()) @map("started_at")
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  @@map("workers")
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?  @map("actor_id")
  action     String
  entityType String   @map("entity_type")
  entityId   String?  @map("entity_id")
  metadata   Json?
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")

  actor User? @relation(fields: [actorId], references: [id])

  @@index([actorId])
  @@index([action])
  @@index([entityType])
  @@index([createdAt])
  @@map("audit_logs")
}

model IdempotencyKey {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  key         String
  requestHash String   @map("request_hash")
  jobId       String   @unique @map("job_id")
  createdAt   DateTime @default(now()) @map("created_at")
  expiresAt   DateTime @map("expires_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  job  Job  @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([userId, key])
  @@index([expiresAt])
  @@map("idempotency_keys")
}
```

---

## 14. API Endpoint Design

Base URL:

```txt
/api/v1
```

## 14.1 Auth Endpoints

```txt
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### Register

```txt
POST /api/v1/auth/register
```

Request:

```json
{
  "name": "Dimas Juli Pratama",
  "email": "dimas@example.com",
  "password": "StrongPassword123"
}
```

Response:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "user_123",
    "name": "Dimas Juli Pratama",
    "email": "dimas@example.com",
    "role": "DEVELOPER"
  }
}
```

### Login

```txt
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "dimas@example.com",
  "password": "StrongPassword123"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "user": {
      "id": "user_123",
      "name": "Dimas Juli Pratama",
      "email": "dimas@example.com",
      "role": "DEVELOPER"
    }
  }
}
```

---

## 14.2 Job Endpoints

```txt
POST   /jobs
GET    /jobs
GET    /jobs/:id
POST   /jobs/:id/retry
POST   /jobs/:id/cancel
GET    /jobs/:id/attempts
GET    /jobs/:id/events
```

### Create Job

```txt
POST /api/v1/jobs
```

Headers:

```txt
Authorization: Bearer <access_token>
Idempotency-Key: invoice-INV-001
```

Request:

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
      {
        "name": "API Usage",
        "quantity": 1,
        "price": 250000
      }
    ]
  }
}
```

Response:

```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "id": "job_123",
    "type": "GENERATE_INVOICE",
    "status": "QUEUED",
    "priority": 2,
    "attempts": 0,
    "maxAttempts": 3,
    "createdAt": "2026-07-02T10:00:00.000Z"
  }
}
```

### Get Job List

```txt
GET /api/v1/jobs?status=FAILED&type=SEND_WEBHOOK&page=1&limit=10
```

Response:

```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": [
    {
      "id": "job_123",
      "type": "SEND_WEBHOOK",
      "status": "FAILED",
      "priority": 3,
      "attempts": 2,
      "maxAttempts": 3,
      "createdAt": "2026-07-02T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### Get Job Detail

```txt
GET /api/v1/jobs/:id
```

Response:

```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "data": {
    "id": "job_123",
    "type": "GENERATE_INVOICE",
    "status": "COMPLETED",
    "payload": {
      "invoiceId": "INV-001"
    },
    "result": {
      "filePath": "/storage/invoices/INV-001.pdf"
    },
    "attempts": 1,
    "maxAttempts": 3,
    "createdAt": "2026-07-02T10:00:00.000Z",
    "completedAt": "2026-07-02T10:00:05.000Z"
  }
}
```

### Retry Job

```txt
POST /api/v1/jobs/:id/retry
```

Aturan:

- hanya job FAILED atau DEAD_LETTER yang bisa retry manual
- user biasa hanya bisa retry job miliknya
- admin bisa retry semua job

Response:

```json
{
  "success": true,
  "message": "Job has been queued for retry",
  "data": {
    "id": "job_123",
    "status": "QUEUED"
  }
}
```

### Cancel Job

```txt
POST /api/v1/jobs/:id/cancel
```

Response:

```json
{
  "success": true,
  "message": "Job cancelled successfully",
  "data": {
    "id": "job_123",
    "status": "CANCELLED"
  }
}
```

---

## 14.3 Queue Endpoints

```txt
GET  /queues/summary
POST /queues/default/pause
POST /queues/default/resume
POST /queues/default/clean
```

### Queue Summary

```txt
GET /api/v1/queues/summary
```

Response:

```json
{
  "success": true,
  "message": "Queue summary retrieved successfully",
  "data": {
    "name": "default",
    "waiting": 12,
    "active": 3,
    "completed": 240,
    "failed": 8,
    "delayed": 4,
    "paused": false
  }
}
```

---

## 14.4 Worker Endpoints

```txt
GET /workers
GET /workers/:id
```

Response:

```json
{
  "success": true,
  "message": "Workers retrieved successfully",
  "data": [
    {
      "id": "worker_123",
      "name": "default-worker-1",
      "status": "ONLINE",
      "concurrency": 5,
      "processedCount": 120,
      "failedCount": 4,
      "lastHeartbeatAt": "2026-07-02T10:00:00.000Z"
    }
  ]
}
```

---

## 14.5 Audit Log Endpoints

```txt
GET /audit-logs
```

Query:

```txt
action
actorId
entityType
from
to
page
limit
```

Response:

```json
{
  "success": true,
  "message": "Audit logs retrieved successfully",
  "data": [
    {
      "id": "audit_123",
      "action": "JOB_CREATED",
      "entityType": "JOB",
      "entityId": "job_123",
      "createdAt": "2026-07-02T10:00:00.000Z"
    }
  ]
}
```

---

## 14.6 Health dan Metrics Endpoints

```txt
GET /health
GET /metrics
```

---

## 15. Standard Response Format

Semua response sukses menggunakan format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Response dengan pagination:

```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

Response error:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "payload.invoiceId",
        "message": "invoiceId is required"
      }
    ]
  }
}
```

---

## 16. Error Code

Gunakan error code yang konsisten.

```txt
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
INTERNAL_SERVER_ERROR
JOB_NOT_FOUND
JOB_NOT_RETRYABLE
JOB_NOT_CANCELLABLE
INVALID_JOB_PAYLOAD
IDEMPOTENCY_CONFLICT
QUEUE_UNAVAILABLE
WORKER_PROCESSING_FAILED
WEBHOOK_DELIVERY_FAILED
EMAIL_DELIVERY_FAILED
REPORT_EXPORT_FAILED
```

---

## 17. Environment Variables

Contoh `.env.example`:

```env
NODE_ENV=development
PORT=4000
HOST=0.0.0.0

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskflow_queue

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_ACCESS_SECRET=change_this_access_secret
JWT_REFRESH_SECRET=change_this_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

DEFAULT_QUEUE_NAME=default
WORKER_NAME=default-worker-1
WORKER_CONCURRENCY=5

STORAGE_PATH=./src/storage

LOG_LEVEL=info
```

Validasi env wajib dilakukan di `src/config/env.ts`.

Contoh aturan:

```txt
PORT harus number
DATABASE_URL wajib ada
REDIS_HOST wajib ada
JWT secret wajib ada
WORKER_CONCURRENCY minimal 1
```

---

## 18. Package Scripts

Contoh `package.json` scripts:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "dev:worker": "tsx watch src/worker.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "start:worker": "node dist/worker.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:seed": "tsx prisma/seed.ts",
    "test": "vitest",
    "test:unit": "vitest tests/unit",
    "test:integration": "vitest tests/integration",
    "test:e2e": "vitest tests/e2e"
  }
}
```

---

## 19. Docker Compose

Contoh `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: taskflow-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: taskflow_queue
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: taskflow-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 20. Worker Flow Detail

Alur worker:

```txt
1. Worker start
2. Worker connect ke Redis
3. Worker register ke tabel workers
4. Worker mengirim heartbeat berkala
5. Worker menunggu job dari queue
6. Job diterima
7. Worker update status job menjadi PROCESSING
8. Worker membuat record job_attempt
9. Worker memilih processor berdasarkan job type
10. Processor menjalankan logic
11. Jika sukses, simpan result dan status COMPLETED
12. Jika gagal, simpan error dan status FAILED atau RETRYING
13. Jika attempts habis, status DEAD_LETTER
14. Audit log dibuat
15. Worker menunggu job berikutnya
```

---

## 21. Processor Design

Gunakan satu function utama untuk memilih processor.

```ts
type JobProcessorInput = {
  jobId: string;
  type: string;
  payload: unknown;
};

type JobProcessorResult = {
  result: unknown;
};
```

Mapping:

```txt
GENERATE_INVOICE -> generateInvoiceProcessor
SEND_EMAIL       -> sendEmailProcessor
SEND_WEBHOOK     -> sendWebhookProcessor
EXPORT_REPORT    -> exportReportProcessor
```

Aturan processor:

- validasi payload sebelum proses
- jangan langsung percaya pada data dari database
- return result dalam bentuk object
- throw AppError jika terjadi error yang diketahui
- jangan menelan error tanpa dicatat

---

## 22. Payload Validation

Gunakan Zod schema per job type.

Contoh konsep:

```ts
const generateInvoicePayloadSchema = z.object({
  invoiceId: z.string().min(1),
  customerName: z.string().min(1),
  items: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().int().positive(),
      price: z.number().positive()
    })
  ).min(1)
});
```

Aturan:

- validasi request saat create job
- validasi ulang saat worker processing
- simpan error validasi dengan code INVALID_JOB_PAYLOAD

---

## 23. Security Considerations

Fitur keamanan:

```txt
password hashing dengan argon2
JWT access token dan refresh token
role-based access control
CORS configuration
security headers dengan helmet
rate limit endpoint sensitif
validasi semua request body
validasi query dan params
jangan tampilkan stack trace ke user biasa
jangan simpan password asli
jangan log token
jangan log payload sensitif
```

Endpoint sensitif:

```txt
POST /auth/login
POST /jobs
POST /jobs/:id/retry
POST /jobs/:id/cancel
POST /queues/default/pause
POST /queues/default/resume
```

---

## 24. Logging Strategy

Gunakan structured logging.

Data yang perlu masuk log:

```txt
request id
user id
job id
worker name
job type
status
attempt number
duration ms
error code
error message
```

Contoh log:

```json
{
  "level": "info",
  "msg": "Job completed",
  "requestId": "req_123",
  "jobId": "job_123",
  "workerName": "default-worker-1",
  "jobType": "GENERATE_INVOICE",
  "durationMs": 2450
}
```

---

## 25. Testing Strategy

## 25.1 Unit Test

Test business logic tanpa database dan Redis asli.

Contoh:

```txt
auth.service.test.ts
- register user berhasil
- email duplicate ditolak
- password salah ditolak

job.service.test.ts
- create job berhasil
- idempotency key mengembalikan job lama
- idempotency conflict ditolak
- cancel job hanya untuk status tertentu

retry.util.test.ts
- menghitung backoff dengan benar
- tidak retry error validasi

payload-validation.test.ts
- payload GENERATE_INVOICE valid diterima
- payload SEND_EMAIL tanpa to ditolak
```

## 25.2 Integration Test

Test API dengan database dan Redis test.

Contoh:

```txt
auth.routes.test.ts
- POST /auth/register
- POST /auth/login
- GET /auth/me

job.routes.test.ts
- POST /jobs
- GET /jobs
- GET /jobs/:id
- POST /jobs/:id/cancel

queue.routes.test.ts
- GET /queues/summary
```

## 25.3 E2E Test

Test flow lengkap.

Contoh:

```txt
create-job-flow.test.ts
- user login
- user create job
- worker process job
- job menjadi completed

retry-job-flow.test.ts
- webhook job gagal
- worker retry
- job selesai setelah percobaan berikutnya

dead-letter-flow.test.ts
- job gagal sampai max attempts
- job menjadi DEAD_LETTER
```

---

## 26. Data Seed

Data awal yang disarankan:

```txt
Admin user
Developer user
Viewer user
Sample GENERATE_INVOICE job
Sample SEND_EMAIL job
Sample SEND_WEBHOOK job
Sample EXPORT_REPORT job
```

Contoh akun:

```txt
Admin
email: admin@taskflow.dev
password: Password123
role: ADMIN

Developer
email: developer@taskflow.dev
password: Password123
role: DEVELOPER

Viewer
email: viewer@taskflow.dev
password: Password123
role: VIEWER
```

Catatan:

- Password di seed tetap harus di-hash.
- Jangan gunakan password seed untuk production.

---

## 27. Roadmap Pengembangan

## 27.1 MVP

Fitur wajib:

```txt
Auth register dan login
JWT access token
Create job
Job list
Job detail
Worker process
Job status tracking
Retry failed job
Cancel queued job
Job attempt logs
Queue summary
Health check
Swagger docs
Docker Compose
Basic tests
```

## 27.2 Versi 2

Fitur lanjutan:

```txt
Dead letter queue
Audit log
Worker monitoring
Idempotency key
Role-based access
Metrics endpoint
Payload validation per job type
Manual retry dari dashboard
```

## 27.3 Versi 3

Fitur advanced:

```txt
Scheduled jobs
Queue pause dan resume
Webhook signature
Email SMTP test integration
PDF invoice generator
CSV export generator
Prometheus metrics
Dashboard frontend
GitHub Actions CI
```

---

## 28. Frontend Dashboard Stack Opsional

Jika ingin membuat web dashboard, gunakan stack berikut:

```txt
React
Vite
TypeScript
Tailwind CSS
React Router
TanStack Query
React Hook Form
Zod
Axios atau fetch wrapper
```

Struktur frontend jika dibuat terpisah:

```txt
taskflow-dashboard/
├── src/
│   ├── app/
│   │   ├── router.tsx
│   │   └── providers.tsx
│   │
│   ├── pages/
│   │   ├── login.page.tsx
│   │   ├── register.page.tsx
│   │   ├── dashboard.page.tsx
│   │   ├── jobs.page.tsx
│   │   ├── create-job.page.tsx
│   │   ├── job-detail.page.tsx
│   │   ├── queues.page.tsx
│   │   ├── workers.page.tsx
│   │   ├── dead-letter.page.tsx
│   │   └── audit-logs.page.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── jobs/
│   │   ├── queues/
│   │   ├── workers/
│   │   └── audit-logs/
│   │
│   ├── components/
│   │   ├── layout/
│   │   ├── ui/
│   │   └── shared/
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── format.ts
│   │
│   └── main.tsx
```

Untuk portofolio Node.js, dashboard frontend cukup sederhana. Backend tetap menjadi fokus utama.

---

## 29. Trade-off Teknis

## 29.1 Kenapa Menggunakan Queue

Keuntungan:

- API lebih responsif
- proses berat tidak memblokir request
- retry lebih mudah
- worker bisa diskalakan terpisah
- failure lebih mudah ditangani

Trade-off:

- butuh Redis
- arsitektur lebih kompleks
- debugging melibatkan lebih banyak komponen
- perlu monitoring queue dan worker

## 29.2 Kenapa Menggunakan PostgreSQL dan Redis Sekaligus

PostgreSQL digunakan untuk data permanen.

Redis digunakan untuk queue state.

Keuntungan:

- data job tetap aman di database
- queue berjalan cepat di Redis
- separation of concern jelas

Trade-off:

- butuh dua service berbeda
- setup development lebih kompleks
- health check perlu memantau dua dependency

## 29.3 Kenapa Menggunakan Idempotency Key

Keuntungan:

- mencegah duplicate job
- aman saat client retry request
- penting untuk job seperti payment, invoice, dan webhook

Trade-off:

- perlu tabel tambahan
- perlu hashing request payload
- perlu aturan conflict yang jelas

## 29.4 Kenapa Worker Dipisah dari API Server

Keuntungan:

- API tetap ringan
- worker bisa diskalakan sendiri
- crash worker tidak langsung mematikan API
- deployment lebih fleksibel

Trade-off:

- butuh process management
- perlu komunikasi melalui Redis dan database
- perlu monitoring worker

---

## 30. README GitHub yang Disarankan

README harus berisi:

```txt
1. Project title
2. Short description
3. Why this project exists
4. Key features
5. Tech stack
6. Architecture diagram
7. Database schema summary
8. API documentation
9. How to run locally
10. How to run worker
11. How to run tests
12. Example API flow
13. Technical trade-offs
14. Future improvements
```

Contoh deskripsi singkat:

```txt
TaskFlow Queue is a TypeScript-based background job processing API built with Node.js, Fastify, PostgreSQL, Redis, Prisma, and BullMQ. It supports job creation, asynchronous worker processing, retry mechanism, idempotency keys, attempt logs, dead letter queue, and operational monitoring.
```

---

## 31. Perintah Setup Lokal

```bash
# clone repository
git clone https://github.com/username/taskflow-queue.git
cd taskflow-queue

# install dependencies
npm install

# copy env
cp .env.example .env

# start database and redis
docker compose up -d

# run migration
npm run prisma:migrate

# seed data
npm run prisma:seed

# run API server
npm run dev

# run worker in another terminal
npm run dev:worker
```

---

## 32. Demo Flow untuk Portofolio

Flow demo yang bisa ditampilkan di README atau video:

```txt
1. Login sebagai developer.
2. Buat job GENERATE_INVOICE.
3. Lihat job masuk status QUEUED.
4. Jalankan worker.
5. Worker memproses job.
6. Job berubah menjadi PROCESSING.
7. Job selesai menjadi COMPLETED.
8. Lihat result invoice.
9. Buat job SEND_WEBHOOK dengan URL gagal.
10. Worker mencoba memproses.
11. Job gagal dan retry otomatis.
12. Setelah attempt habis, job masuk DEAD_LETTER.
13. Admin melakukan manual retry.
14. Audit log menampilkan semua aktivitas.
```

---

## 33. Hal yang Harus Ditekankan Saat Interview

Poin yang bisa dijelaskan:

```txt
Saya membuat TaskFlow Queue untuk menunjukkan pemahaman saya tentang background job processing di Node.js.

API server hanya bertugas menerima request dan membuat job, sedangkan proses berat dijalankan worker secara asynchronous.

Saya menggunakan Redis dan BullMQ untuk queue karena mendukung retry, delayed job, dan worker concurrency.

Saya menggunakan PostgreSQL untuk menyimpan status job, attempt log, audit log, dan idempotency key agar proses bisa ditelusuri.

Saya menambahkan idempotency key untuk mencegah duplicate job ketika client mengirim request ulang setelah timeout.

Saya mencatat setiap attempt agar error bisa dianalisis dengan jelas.

Saya juga menambahkan dead letter queue untuk memisahkan job yang gagal permanen dari job normal.
```

---

## 34. Checklist Penyelesaian Proyek

## 34.1 Backend Core

```txt
[ ] Setup Node.js TypeScript
[ ] Setup Fastify server
[ ] Setup Prisma
[ ] Setup PostgreSQL
[ ] Setup Redis
[ ] Setup BullMQ
[ ] Setup env validation
[ ] Setup logger
[ ] Setup global error handler
```

## 34.2 Auth

```txt
[ ] Register
[ ] Login
[ ] Refresh token
[ ] Logout
[ ] Get current user
[ ] Password hashing
[ ] Role middleware
```

## 34.3 Job

```txt
[ ] Create job
[ ] Get job list
[ ] Get job detail
[ ] Cancel job
[ ] Retry job
[ ] Job payload validation
[ ] Idempotency key
```

## 34.4 Worker

```txt
[ ] Worker process
[ ] Generate invoice processor
[ ] Send email processor
[ ] Send webhook processor
[ ] Export report processor
[ ] Attempt logging
[ ] Retry handling
[ ] Dead letter handling
[ ] Worker heartbeat
```

## 34.5 Monitoring

```txt
[ ] Queue summary
[ ] Worker list
[ ] Health check
[ ] Metrics summary
[ ] Audit log
[ ] Job events
```

## 34.6 Documentation

```txt
[ ] Swagger docs
[ ] README.md
[ ] docs/architecture.md
[ ] docs/api.md
[ ] docs/database.md
[ ] docs/trade-offs.md
```

## 34.7 Testing

```txt
[ ] Unit tests
[ ] Integration tests
[ ] E2E tests
[ ] Test create job flow
[ ] Test retry flow
[ ] Test dead letter flow
[ ] Test idempotency conflict
```

---

## 35. Kesimpulan

TaskFlow Queue adalah proyek portofolio backend Node.js yang kuat karena mencakup banyak konsep yang relevan untuk pekerjaan Node.js Developer:

- TypeScript
- REST API
- PostgreSQL
- Redis
- BullMQ
- worker process
- retry mechanism
- idempotency
- dead letter queue
- audit log
- metrics
- testing
- documentation
- backend architecture
- distributed system debugging

Proyek ini menunjukkan bahwa developer tidak hanya bisa membuat endpoint CRUD, tetapi juga memahami bagaimana backend production menangani proses asynchronous, kegagalan sistem, retry, observability, dan technical trade-off.
