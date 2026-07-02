import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../config/env.js';

export async function processExportReportJob(_payload:any) {
  await mkdir(join(env.STORAGE_PATH, 'reports'), { recursive:true });
  const filePath = join(env.STORAGE_PATH, 'reports', `job-summary-${Date.now()}.csv`);
  await writeFile(filePath, 'status,count\nCOMPLETED,0\nFAILED,0\n');
  return { filePath, rows:2 };
}
