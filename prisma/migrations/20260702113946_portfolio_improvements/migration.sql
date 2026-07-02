-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "current_queue_job_id" TEXT,
ADD COLUMN     "manual_retry_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "jobs_created_at_idx" ON "jobs"("created_at");

-- CreateIndex
CREATE INDEX "jobs_status_created_at_idx" ON "jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "jobs_type_status_idx" ON "jobs"("type", "status");

-- CreateIndex
CREATE INDEX "jobs_created_by_id_status_idx" ON "jobs"("created_by_id", "status");
