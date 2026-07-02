import { jobQueue } from '../../config/queue.js';

export async function getQueueSummary() { return jobQueue.getJobCounts(); }
export async function pauseQueue() { await jobQueue.pause(); return null; }
export async function resumeQueue() { await jobQueue.resume(); return null; }
export async function cleanQueue() {
  return { completed: await jobQueue.clean(0, 1000, 'completed'), failed: await jobQueue.clean(0, 1000, 'failed') };
}
